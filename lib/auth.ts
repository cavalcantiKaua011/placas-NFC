import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isDemo, supabaseEnv } from '@/lib/env';
import { DEMO_COOKIE } from '@/lib/demo-cookie';
import { createClient } from '@/lib/supabase/server';
import { SupabaseRepo } from '@/lib/data/supabase-repo';
import { DemoRepo } from '@/lib/data/demo-repo';
import type { Repo } from '@/lib/data/repo';

export type Sessao =
  | { estado: 'admin'; email: string; demo: boolean; repo: Repo }
  | { estado: 'anonimo' }
  | { estado: 'proibido'; email: string }
  | { estado: 'sem-config' };

/**
 * Identifica o administrador. A autorização vem da tabela public.admins
 * (função is_admin no banco) — estar logado NÃO basta.
 * `cache` evita repetir a consulta entre layout e página na mesma requisição.
 */
export const obterSessao = cache(async (): Promise<Sessao> => {
  if (isDemo()) {
    const logado = cookies().get(DEMO_COOKIE)?.value === '1';
    return logado ? { estado: 'admin', email: 'demonstracao@exemplo.com', demo: true, repo: new DemoRepo() } : { estado: 'anonimo' };
  }

  if (!supabaseEnv()) return { estado: 'sem-config' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { estado: 'anonimo' };

  const { data: admin, error } = await supabase.rpc('is_admin');
  if (error || admin !== true) return { estado: 'proibido', email: user.email ?? '' };

  return { estado: 'admin', email: user.email ?? '', demo: false, repo: new SupabaseRepo(supabase) };
});

/** Para páginas do painel: garante administrador ou redireciona ao login. */
export async function paginaAdmin() {
  const s = await obterSessao();
  if (s.estado !== 'admin') redirect('/login');
  return s;
}

export class NaoAutorizado extends Error {
  constructor() {
    super('Sessão expirada ou sem permissão. Entre novamente.');
  }
}

/** Para Server Actions: lança erro se não for administrador (nunca confia no cliente). */
export async function acaoAdmin() {
  const s = await obterSessao();
  if (s.estado !== 'admin') throw new NaoAutorizado();
  return s;
}
