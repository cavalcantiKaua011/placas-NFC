-- =====================================================================
-- Placas NFC / QR Code — Schema Supabase
-- Execute este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Administradores (somente usuários listados aqui acessam o painel)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Geração automática de código: NFC-0001, NFC-0002, ...
-- ---------------------------------------------------------------------
create sequence if not exists public.plaquinha_seq start 1;

create or replace function public.gerar_codigo_plaquinha()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint := nextval('public.plaquinha_seq');
begin
  -- lpad cortaria números acima de 9999, então só preenche quando necessário
  if n < 10000 then
    return 'NFC-' || lpad(n::text, 4, '0');
  end if;
  return 'NFC-' || n::text;
end;
$$;

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.clientes (
  id            uuid primary key default gen_random_uuid(),
  nome_empresa  text not null,
  responsavel   text,
  whatsapp      text,
  data_criacao  timestamptz not null default now()
);

create table if not exists public.plaquinhas (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique default public.gerar_codigo_plaquinha(),
  url_permanente  text,
  qr_code         text,              -- PNG em data URL (base64)
  status          text not null default 'aguardando'
                  check (status in ('aguardando', 'ativa', 'desativada')),
  cliente_id      uuid references public.clientes (id) on delete set null,
  data_venda      date,
  valor_venda     numeric(12, 2),
  total_leituras  integer not null default 0,
  ultimo_acesso   timestamptz,
  data_criacao    timestamptz not null default now()
);

create table if not exists public.configuracoes (
  plaque_id      uuid primary key references public.plaquinhas (id) on delete cascade,
  destino_tipo   text not null
                 check (destino_tipo in ('google_reviews', 'whatsapp', 'instagram', 'site', 'personalizado')),
  destino_valor  text,               -- o que o admin digitou (ex: @perfil, número)
  destino_url    text not null,      -- URL final normalizada
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.acessos (
  id          bigint generated always as identity primary key,
  plaque_id   uuid not null references public.plaquinhas (id) on delete cascade,
  data_hora   timestamptz not null default now(),
  ip          text,
  user_agent  text
);

create index if not exists acessos_plaque_data_idx on public.acessos (plaque_id, data_hora desc);
create index if not exists acessos_data_idx on public.acessos (data_hora desc);
create index if not exists plaquinhas_status_idx on public.plaquinhas (status);
create index if not exists plaquinhas_cliente_idx on public.plaquinhas (cliente_id);

-- ---------------------------------------------------------------------
-- View usada na listagem (permite filtrar por empresa e código juntos)
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
  cfg.destino_url
from public.plaquinhas p
left join public.clientes c on c.id = p.cliente_id
left join public.configuracoes cfg on cfg.plaque_id = p.id;

-- ---------------------------------------------------------------------
-- Row Level Security: somente administradores leem/escrevem
-- ---------------------------------------------------------------------
alter table public.admins        enable row level security;
alter table public.clientes      enable row level security;
alter table public.plaquinhas    enable row level security;
alter table public.configuracoes enable row level security;
alter table public.acessos       enable row level security;

drop policy if exists "admin le admins" on public.admins;
create policy "admin le admins" on public.admins
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin total clientes" on public.clientes;
create policy "admin total clientes" on public.clientes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin total plaquinhas" on public.plaquinhas;
create policy "admin total plaquinhas" on public.plaquinhas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin total configuracoes" on public.configuracoes;
create policy "admin total configuracoes" on public.configuracoes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin total acessos" on public.acessos;
create policy "admin total acessos" on public.acessos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Redirecionamento público: busca destino e registra a leitura.
-- Roda como security definer, então visitantes anônimos NÃO enxergam
-- as tabelas — só recebem o status e a URL de destino.
-- ---------------------------------------------------------------------
create or replace function public.registrar_acesso(
  p_codigo     text,
  p_ip         text default null,
  p_user_agent text default null
)
returns table (status text, destino_url text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_id     uuid;
  v_status text;
  v_url    text;
begin
  select p.id, p.status, cfg.destino_url
    into v_id, v_status, v_url
  from public.plaquinhas p
  left join public.configuracoes cfg on cfg.plaque_id = p.id
  where p.codigo = upper(trim(p_codigo));

  if v_id is null then
    return; -- código não existe: nenhuma linha
  end if;

  if v_status = 'ativa' and v_url is not null then
    insert into public.acessos (plaque_id, ip, user_agent)
    values (v_id, left(p_ip, 64), left(p_user_agent, 300));

    update public.plaquinhas
       set total_leituras = total_leituras + 1,
           ultimo_acesso  = now()
     where id = v_id;
  end if;

  return query select v_status, case when v_status = 'ativa' then v_url else null end;
end;
$$;

revoke all on function public.registrar_acesso(text, text, text) from public;
grant execute on function public.registrar_acesso(text, text, text) to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant usage on sequence public.plaquinha_seq to authenticated;

-- ---------------------------------------------------------------------
-- Funções do dashboard (respeitam RLS: só retornam dados para admins)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns table (
  total bigint,
  ativas bigint,
  aguardando bigint,
  desativadas bigint,
  leituras bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*),
    count(*) filter (where status = 'ativa'),
    count(*) filter (where status = 'aguardando'),
    count(*) filter (where status = 'desativada'),
    coalesce(sum(total_leituras), 0)
  from public.plaquinhas;
$$;

create or replace function public.leituras_por_dia(p_dias integer default 14)
returns table (dia date, total bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with dias as (
    select generate_series(
      (now() at time zone 'America/Sao_Paulo')::date - (p_dias - 1),
      (now() at time zone 'America/Sao_Paulo')::date,
      interval '1 day'
    )::date as dia
  )
  select d.dia, count(a.id)
  from dias d
  left join public.acessos a
    on a.data_hora >= now() - (p_dias + 1) * interval '1 day'
   and (a.data_hora at time zone 'America/Sao_Paulo')::date = d.dia
  group by d.dia
  order by d.dia;
$$;

grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.leituras_por_dia(integer) to authenticated;

-- =====================================================================
-- DEPOIS de criar seu usuário em Authentication > Users, rode:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'seu-email@exemplo.com';
-- =====================================================================
