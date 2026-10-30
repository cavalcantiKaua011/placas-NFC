-- =====================================================================
-- 002 — Reestruturação (NÃO destrutiva)
--
-- Rode este arquivo UMA vez no SQL Editor do Supabase, depois do 001.
-- Nenhuma tabela é apagada e nenhum dado existente é removido.
--
-- Resumo e justificativa de cada mudança:
--  1. plaquinhas.codigo_publico  → código aleatório (8 caracteres) usado no
--     QR/NFC (/r/CODIGO). O código sequencial NFC-0001 vira só a etiqueta
--     interna; não aparece mais na URL pública (evita adivinhar códigos).
--  2. Trigger que impede alterar codigo / codigo_publico depois de criados.
--  3. configuracoes: novo tipo "cardapio" e destino obrigatoriamente HTTPS
--     (constraint NOT VALID: vale para gravações novas, não quebra dados antigos).
--  4. clientes.observacoes (observações operacionais).
--  5. acessos.ip_hash / acessos.dispositivo → a leitura deixa de gravar IP e
--     user-agent completos (dados pessoais desnecessários). As colunas antigas
--     ip / user_agent continuam existindo, mas não são mais preenchidas.
--  6. plaquinha_eventos + triggers → histórico de alterações relevantes
--     (criação, vínculo de cliente, destino, status).
--  7. resolver_redirect() substitui registrar_acesso(): retorna só status e
--     destino; a falha ao registrar a leitura NÃO impede o redirecionamento;
--     leituras repetidas do mesmo visitante em 30 s não são contadas de novo.
--  8. Funções revisadas: search_path vazio e objetos qualificados; funções
--     SECURITY DEFINER apenas onde é necessário.
--  9. Permissões: o papel anon perde acesso direto a tabelas/views (já era
--     bloqueado pela RLS; agora também pelo GRANT) e só executa resolver_redirect.
-- 10. Views vw_plaquinhas (coluna nova no fim) e vw_acessos (histórico).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Código público aleatório
-- ---------------------------------------------------------------------
-- Alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L). 31^8 ≈ 850 bilhões.
create or replace function public.gerar_codigo_publico()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alfabeto constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea := pg_catalog.uuid_send(pg_catalog.gen_random_uuid())
              || pg_catalog.uuid_send(pg_catalog.gen_random_uuid());
  resultado text := '';
  i int;
begin
  for i in 0..7 loop
    resultado := resultado
      || pg_catalog.substr(alfabeto, (pg_catalog.get_byte(bytes, i * 2) % 31) + 1, 1);
  end loop;
  return resultado;
end;
$$;

alter table public.plaquinhas add column if not exists codigo_publico text;

update public.plaquinhas
   set codigo_publico = public.gerar_codigo_publico()
 where codigo_publico is null;

alter table public.plaquinhas alter column codigo_publico set default public.gerar_codigo_publico();
alter table public.plaquinhas alter column codigo_publico set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'plaquinhas_codigo_publico_key') then
    alter table public.plaquinhas add constraint plaquinhas_codigo_publico_key unique (codigo_publico);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'plaquinhas_codigo_publico_formato') then
    alter table public.plaquinhas
      add constraint plaquinhas_codigo_publico_formato check (codigo_publico ~ '^[A-Z0-9-]{4,32}$');
  end if;
end $$;

-- A geração do código interno não precisa de privilégio elevado.
create or replace function public.gerar_codigo_plaquinha()
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n bigint := pg_catalog.nextval('public.plaquinha_seq');
begin
  if n < 10000 then
    return 'NFC-' || pg_catalog.lpad(n::text, 4, '0');
  end if;
  return 'NFC-' || n::text;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Códigos são imutáveis
-- ---------------------------------------------------------------------
create or replace function public.proteger_codigos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo is distinct from old.codigo
     or new.codigo_publico is distinct from old.codigo_publico then
    raise exception 'O código de uma plaquinha não pode ser alterado.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proteger_codigos on public.plaquinhas;
create trigger trg_proteger_codigos
  before update on public.plaquinhas
  for each row execute function public.proteger_codigos();

-- ---------------------------------------------------------------------
-- 3. Destinos: novo tipo "cardapio" e somente HTTPS
-- ---------------------------------------------------------------------
alter table public.configuracoes drop constraint if exists configuracoes_destino_tipo_check;
alter table public.configuracoes
  add constraint configuracoes_destino_tipo_check
  check (destino_tipo in ('google_reviews', 'whatsapp', 'instagram', 'cardapio', 'site', 'personalizado'));

alter table public.configuracoes drop constraint if exists configuracoes_destino_https;
alter table public.configuracoes
  add constraint configuracoes_destino_https
  check (destino_url ~ '^https://[^\s/]+\.[^\s]+$' and length(destino_url) <= 2048) not valid;

-- ---------------------------------------------------------------------
-- 4. Observações do cliente
-- ---------------------------------------------------------------------
alter table public.clientes add column if not exists observacoes text;

-- ---------------------------------------------------------------------
-- 5. Leituras sem dados pessoais desnecessários
-- ---------------------------------------------------------------------
alter table public.acessos add column if not exists ip_hash text;
alter table public.acessos add column if not exists dispositivo text;

alter table public.acessos drop constraint if exists acessos_dispositivo_check;
alter table public.acessos
  add constraint acessos_dispositivo_check
  check (dispositivo is null or dispositivo in ('ios', 'android', 'desktop', 'outro')) not valid;

create index if not exists acessos_plaque_hash_idx on public.acessos (plaque_id, ip_hash, data_hora desc);

-- ---------------------------------------------------------------------
-- 6. Histórico de alterações
-- ---------------------------------------------------------------------
create table if not exists public.plaquinha_eventos (
  id         bigint generated always as identity primary key,
  plaque_id  uuid not null references public.plaquinhas (id) on delete cascade,
  tipo       text not null check (tipo in ('criada', 'cliente', 'destino', 'status', 'venda')),
  descricao  text not null,
  autor      uuid default auth.uid(),
  criado_em  timestamptz not null default now()
);

create index if not exists plaquinha_eventos_plaque_idx on public.plaquinha_eventos (plaque_id, criado_em desc);

alter table public.plaquinha_eventos enable row level security;

drop policy if exists "admin le eventos" on public.plaquinha_eventos;
create policy "admin le eventos" on public.plaquinha_eventos
  for select to authenticated using (public.is_admin());
-- Sem policy de insert/update/delete: só os triggers abaixo gravam eventos.

create or replace function public.status_label(s text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'aguardando' then 'Aguardando configuração'
    when 'ativa' then 'Ativa'
    when 'desativada' then 'Desativada'
    else s
  end;
$$;

-- SECURITY DEFINER: o trigger precisa gravar em plaquinha_eventos, que não
-- tem policy de insert para ninguém. A função não recebe parâmetros do
-- usuário além da própria linha alterada.
create or replace function public.log_evento_plaquinha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
begin
  if tg_op = 'INSERT' then
    insert into public.plaquinha_eventos (plaque_id, tipo, descricao)
    values (new.id, 'criada', 'Plaquinha criada');
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.plaquinha_eventos (plaque_id, tipo, descricao)
    values (new.id, 'status',
            'Status: ' || public.status_label(old.status) || ' → ' || public.status_label(new.status));
  end if;

  if new.cliente_id is distinct from old.cliente_id then
    select c.nome_empresa into v_nome from public.clientes c where c.id = new.cliente_id;
    insert into public.plaquinha_eventos (plaque_id, tipo, descricao)
    values (new.id, 'cliente',
            case when new.cliente_id is null then 'Cliente desvinculado'
                 else 'Vinculada ao cliente ' || coalesce(v_nome, '(sem nome)') end);
  end if;

  if new.data_venda is distinct from old.data_venda or new.valor_venda is distinct from old.valor_venda then
    insert into public.plaquinha_eventos (plaque_id, tipo, descricao)
    values (new.id, 'venda', 'Dados da venda atualizados');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_log_evento_plaquinha on public.plaquinhas;
create trigger trg_log_evento_plaquinha
  after insert or update of status, cliente_id, data_venda, valor_venda on public.plaquinhas
  for each row execute function public.log_evento_plaquinha();

create or replace function public.log_evento_destino()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.destino_url is distinct from old.destino_url then
    insert into public.plaquinha_eventos (plaque_id, tipo, descricao)
    values (new.plaque_id, 'destino', 'Destino definido: ' || new.destino_url);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_evento_destino on public.configuracoes;
create trigger trg_log_evento_destino
  after insert or update on public.configuracoes
  for each row execute function public.log_evento_destino();

revoke all on function public.log_evento_plaquinha() from public, anon, authenticated;
revoke all on function public.log_evento_destino() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Redirecionamento público
-- ---------------------------------------------------------------------
drop function if exists public.registrar_acesso(text, text, text);

create or replace function public.resolver_redirect(
  p_codigo      text,
  p_ip_hash     text default null,
  p_dispositivo text default null
)
returns table (status text, destino_url text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_id     uuid;
  v_status text;
  v_url    text;
  v_codigo text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_codigo, '')));
begin
  if v_codigo !~ '^[A-Z0-9-]{4,32}$' then
    return;
  end if;

  select p.id, p.status, cfg.destino_url
    into v_id, v_status, v_url
    from public.plaquinhas p
    left join public.configuracoes cfg on cfg.plaque_id = p.id
   where p.codigo_publico = v_codigo;

  if v_id is null then
    return;
  end if;

  if v_status = 'ativa' and v_url ~ '^https://' then
    -- Registrar a leitura nunca pode impedir o redirecionamento.
    begin
      if p_ip_hash is null or not exists (
        select 1 from public.acessos a
         where a.plaque_id = v_id
           and a.ip_hash = p_ip_hash
           and a.data_hora > now() - interval '30 seconds'
      ) then
        insert into public.acessos (plaque_id, ip_hash, dispositivo)
        values (
          v_id,
          pg_catalog.left(p_ip_hash, 64),
          case when p_dispositivo in ('ios', 'android', 'desktop') then p_dispositivo else 'outro' end
        );

        update public.plaquinhas
           set total_leituras = total_leituras + 1,
               ultimo_acesso  = now()
         where id = v_id;
      end if;
    exception when others then
      raise warning 'resolver_redirect: falha ao registrar leitura (%)', sqlerrm;
    end;
  end if;

  return query
    select v_status,
           case when v_status = 'ativa' and v_url ~ '^https://' then v_url else null end;
end;
$$;

revoke all on function public.resolver_redirect(text, text, text) from public;
grant execute on function public.resolver_redirect(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Revisão das funções existentes (search_path vazio, nomes qualificados)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

create or replace function public.dashboard_stats()
returns table (total bigint, ativas bigint, aguardando bigint, desativadas bigint, leituras bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where p.status = 'ativa'),
    count(*) filter (where p.status = 'aguardando'),
    count(*) filter (where p.status = 'desativada'),
    coalesce(sum(p.total_leituras), 0)
  from public.plaquinhas p;
$$;

create or replace function public.leituras_por_dia(p_dias integer default 14)
returns table (dia date, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with dias as (
    select pg_catalog.generate_series(
      (now() at time zone 'America/Sao_Paulo')::date - (least(greatest(p_dias, 1), 366) - 1),
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as dia
  )
  select d.dia, count(a.id)
    from dias d
    left join public.acessos a
      on a.data_hora >= now() - (least(greatest(p_dias, 1), 366) + 1) * interval '1 day'
     and (a.data_hora at time zone 'America/Sao_Paulo')::date = d.dia
   group by d.dia
   order by d.dia;
$$;

-- ---------------------------------------------------------------------
-- 9. Permissões
-- ---------------------------------------------------------------------
-- Funções novas são executáveis por PUBLIC por padrão no Postgres: restringir.
revoke execute on function public.dashboard_stats() from public, anon;
revoke execute on function public.leituras_por_dia(integer) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.gerar_codigo_publico() from public, anon;
revoke execute on function public.gerar_codigo_plaquinha() from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.leituras_por_dia(integer) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.gerar_codigo_publico() to authenticated;
grant execute on function public.gerar_codigo_plaquinha() to authenticated;

-- Visitante anônimo não acessa tabelas diretamente (a RLS já bloqueava).
revoke all on public.admins, public.clientes, public.plaquinhas, public.configuracoes,
              public.acessos, public.plaquinha_eventos from anon;
revoke all on sequence public.plaquinha_seq from anon;

grant select, insert, update, delete on public.clientes, public.plaquinhas, public.configuracoes,
                                        public.acessos to authenticated;
grant select on public.admins, public.plaquinha_eventos to authenticated;
grant usage on sequence public.plaquinha_seq to authenticated;

-- ---------------------------------------------------------------------
-- 10. Views
-- ---------------------------------------------------------------------
create or replace view public.vw_plaquinhas
with (security_invoker = true) as
select
  p.id,
  p.codigo,
  p.url_permanente,
  p.status,
  p.data_venda,
  p.valor_venda,
  p.total_leituras,
  p.ultimo_acesso,
  p.data_criacao,
  p.cliente_id,
  c.nome_empresa,
  c.responsavel,
  c.whatsapp,
  cfg.destino_tipo,
  cfg.destino_url,
  p.codigo_publico
from public.plaquinhas p
left join public.clientes c on c.id = p.cliente_id
left join public.configuracoes cfg on cfg.plaque_id = p.id;

create or replace view public.vw_acessos
with (security_invoker = true) as
select
  a.id,
  a.data_hora,
  a.dispositivo,
  a.plaque_id,
  p.codigo,
  p.codigo_publico,
  p.cliente_id,
  c.nome_empresa
from public.acessos a
join public.plaquinhas p on p.id = a.plaque_id
left join public.clientes c on c.id = p.cliente_id;

revoke all on public.vw_plaquinhas, public.vw_acessos from anon;
grant select on public.vw_plaquinhas, public.vw_acessos to authenticated;

commit;
