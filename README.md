# Placas NFC — gestão de plaquinhas NFC e QR Code

Painel para cadastrar plaquinhas **antes da venda**, vincular cada uma a um cliente, configurar o destino
(Google, Instagram, WhatsApp, cardápio ou outro link HTTPS) e acompanhar as leituras.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Vercel

---

## 1. Como funciona

```
QR Code / chip NFC  ──►  https://SEU-DOMINIO/r/K7M2QX9P  ──►  destino configurado no painel
                         (nunca muda)                         (pode mudar a qualquer momento)
```

- Cada plaquinha tem um **código público aleatório** de 8 caracteres (ex.: `K7M2QX9P`), usado no QR e no NFC,
  e uma **etiqueta interna** sequencial (`NFC-0001`) que só aparece no painel.
- A rota pública `/r/CODIGO` consulta o banco, registra a leitura e redireciona. O destino **vem sempre do banco**,
  nunca da URL (não existe redirecionamento aberto). Só destinos `https://` são aceitos.
- Plaquinha aguardando configuração, desativada ou inexistente mostra uma página de estado, sem redirecionar.
- A leitura grava só **data/hora e tipo de aparelho** (iPhone, Android, computador). O IP **não** é salvo; com
  `IP_HASH_SALT` definido, um hash diário do IP é usado apenas para não contar várias vezes a mesma leitura (30 s).
- Se o registro da leitura falhar, o redirecionamento acontece mesmo assim.

> **Importante sobre plaquinhas físicas:** o destino só pode ser trocado pelo painel se o QR Code / chip apontar
> para `/r/CODIGO` **no seu domínio**. Plaquinhas que apontam para o site de outro fornecedor não podem ser
> controladas por este sistema — seria necessário regravar o NFC e reimprimir o QR com o link novo.
> Defina o domínio definitivo (`NEXT_PUBLIC_SITE_URL`) **antes** de imprimir.

## 2. Estrutura

| Área | Rotas | Acesso |
|---|---|---|
| Site público | `/` | aberto, sem dados reais |
| Login | `/login` | aberto |
| Painel | `/painel` (visão geral), `/painel/plaquinhas`, `/painel/configurar`, `/painel/clientes`, `/painel/acessos`, `/painel/configuracoes` | **somente administrador** |
| Redirecionamento | `/r/[codigo]` | aberto, retorna só o redirecionamento |
| Estado | `/indisponivel` | aberto, mensagem genérica |

Autorização em três camadas: middleware (sessão) → servidor (`lib/auth.ts`, consulta `is_admin()` em toda página
e Server Action) → banco (RLS: só usuários na tabela `public.admins` leem ou gravam). Estar logado **não** basta.

```
app/
  page.tsx                  site público
  login/                    login do administrador (ou entrada da demonstração)
  painel/                   painel (layout, páginas e actions.ts com todas as operações)
  r/[codigo]/route.ts       redirecionamento público
lib/
  auth.ts                   sessão + autorização do administrador
  data/repo.ts              interface de dados do painel
  data/supabase-repo.ts     implementação real (Supabase)
  data/demo-repo.ts         implementação de demonstração (memória, dados fictícios)
  destino.ts, codigo.ts     validações (HTTPS, WhatsApp, Instagram, códigos)
  redirect.ts               lógica da rota /r/
supabase/migrations/        SQL (001 = schema original, 002 = reestruturação não destrutiva)
tests/                      testes unitários (Vitest)
```

## 3. Três ambientes

| | Desenvolvimento local | Demonstração online | Produção |
|---|---|---|---|
| Para quê | programar e testar no PC | mostrar/validar a interface | uso real |
| Dados | demo (memória) **ou** projeto Supabase de teste | fictícios em memória **ou** projeto Supabase só para demo | Supabase de produção |
| Login | botão "Entrar na demonstração" ou usuário de teste | botão "Entrar na demonstração" | e-mail e senha do administrador |
| Variáveis | `.env.local` | projeto Vercel separado | projeto Vercel principal |
| Pode alterar dados reais? | não (se não usar as chaves de produção) | **não** | sim |

**Nunca** use as chaves do Supabase de produção no `.env.local` nem no projeto de demonstração.

### Sobre o modo demonstração (`DEMO_MODE=true`)

- Não cria cliente do Supabase em nenhum momento; nenhuma chave é necessária.
- Mostra uma faixa amarela em todas as telas do painel e as mensagens de sucesso dizem "demonstração: nada foi
  gravado no banco real".
- Os dados ficam na memória do servidor: voltam ao exemplo quando o servidor reinicia. Na Vercel isso acontece com
  frequência e instâncias diferentes podem mostrar dados diferentes — é esperado. Para uma demonstração com dados
  persistentes, use um **segundo projeto Supabase** só para demo (mesmo código, `DEMO_MODE=false`, chaves próprias).
- Na demo, a rota `/r/CODIGO` não sai do site: mostra para onde a plaquinha levaria e registra a leitura.

## 4. Rodar no computador

Pré-requisito: [Node.js 20 LTS](https://nodejs.org) ou superior.

```bash
npm install
cp .env.example .env.local     # no Windows: copy .env.example .env.local
```

**Opção A — só a interface, sem banco:** no `.env.local`, deixe `DEMO_MODE=true`.

**Opção B — com Supabase de teste:** `DEMO_MODE=false` e preencha `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_ANON_KEY` de um projeto Supabase **de teste** (passos da seção 5).

```bash
npm run dev        # abre em http://localhost:3000
npm run build      # compila para produção (o mesmo que a Vercel executa)
npm start          # roda a versão compilada
npm run lint       # verificação de código
npm test           # testes unitários
```

## 5. Banco de dados (Supabase)

### Projeto novo
1. Crie o projeto em <https://supabase.com>.
2. SQL Editor → rode `supabase/migrations/001_schema_inicial.sql` e depois `002_reestruturacao.sql`.
3. Authentication → Users → **Add user** (e-mail e senha do administrador).
4. Autorize esse usuário:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```
5. Authentication → Sign In / Providers → desative **Allow new users to sign up**.

### Projeto que já rodou a versão anterior
Rode **apenas** `002_reestruturacao.sql`. Ela é não destrutiva: não apaga tabelas nem dados.
O que muda e por quê está comentado no topo do arquivo. Resumo:

| Mudança | Motivo |
|---|---|
| `plaquinhas.codigo_publico` (aleatório, único, imutável) | o código sequencial `NFC-0001` era fácil de adivinhar |
| trigger `proteger_codigos` | impedir alterar códigos já impressos |
| destino só `https://` + tipo `cardapio` | segurança e requisito do produto (constraint `NOT VALID` não quebra dados antigos) |
| `clientes.observacoes` | observações operacionais |
| `acessos.ip_hash`, `acessos.dispositivo` | parar de gravar IP e user-agent completos |
| tabela `plaquinha_eventos` + triggers | histórico de alterações (criação, cliente, destino, status, venda) |
| `resolver_redirect()` substitui `registrar_acesso()` | falha no registro não bloqueia o redirecionamento; leituras repetidas não inflam a contagem |
| funções com `search_path = ''` e nomes qualificados; `SECURITY DEFINER` só onde necessário | recomendação de segurança do Postgres/Supabase |
| `anon` sem acesso direto a tabelas | antes só a RLS bloqueava; agora o GRANT também |
| views `vw_plaquinhas` (coluna nova) e `vw_acessos` | listagens e histórico |

As colunas antigas `acessos.ip`, `acessos.user_agent` e `plaquinhas.qr_code` continuam existindo, mas não são mais
preenchidas (o QR é gerado na hora a partir do domínio atual). Se quiser apagar o IP já gravado pela versão anterior:
`update public.acessos set ip = null, user_agent = null;` (opcional, irreversível).

## 6. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DEMO_MODE` | não | `true` = demonstração em memória; padrão `false` |
| `NEXT_PUBLIC_SUPABASE_URL` | sim, fora da demo | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim, fora da demo | chave **anon/public** (é pública por natureza; a segurança vem da RLS) |
| `NEXT_PUBLIC_SITE_URL` | sim, em produção | domínio definitivo, sem `/` no fim. Vai dentro dos QR Codes |
| `IP_HASH_SALT` | recomendado | texto aleatório secreto (`openssl rand -hex 32`). **Não** use prefixo `NEXT_PUBLIC_` |

A chave `service_role` **não** é usada. Não a cadastre em lugar nenhum deste projeto.

## 7. Publicar na Vercel

### Produção
1. Importe o repositório do GitHub na Vercel.
2. Settings → Environment Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `NEXT_PUBLIC_SITE_URL`, `IP_HASH_SALT` (e `DEMO_MODE=false` ou ausente).
3. Deploy. Só considere publicado se o log mostrar **"Compiled successfully"**.
4. Settings → Domains: conecte seu domínio e ajuste `NEXT_PUBLIC_SITE_URL` para ele → Redeploy.

### Demonstração (URL separada)
1. Na Vercel, **Add New → Project** e importe **o mesmo repositório** de novo, com outro nome (ex.: `placas-nfc-demo`).
2. Variáveis: apenas `DEMO_MODE=true` (sem chaves do Supabase).
3. Deploy → a URL `placas-nfc-demo.vercel.app` mostra o site e o botão "Entrar na demonstração".

## 8. Checklist de validação manual (após configurar o Supabase)

1. Abrir `/` sem login → página pública, sem dados reais.
2. Abrir `/painel` sem login → vai para `/login`.
3. Entrar com um usuário **que não está** em `admins` → "Acesso restrito".
4. Entrar como administrador → Visão geral com números reais.
5. Minhas Plaquinhas → Nova plaquinha (gerar 2) e Importar códigos.
6. Configurar plaquinha → localizar código → novo cliente → destino → Salvar e ativar.
7. Abrir o link `/r/CODIGO` no celular → deve ir para o destino; a leitura aparece no Histórico.
8. Desativar a plaquinha → `/r/CODIGO` mostra "Plaquinha desativada".
9. Tentar salvar destino `http://...` ou `javascript:` → erro.
10. Testar no celular (menu ☰) e no computador.
