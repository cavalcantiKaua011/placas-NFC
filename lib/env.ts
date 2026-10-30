/** Leitura centralizada das variáveis de ambiente. */

export function isDemo(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export function supabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || url.includes('SEU-PROJETO')) return null;
  return { url, anonKey };
}

export function requireSupabaseEnv() {
  const env = supabaseEnv();
  if (!env) {
    throw new Error(
      'Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (ou use DEMO_MODE=true).',
    );
  }
  return env;
}

export function ipHashSalt(): string | null {
  const s = process.env.IP_HASH_SALT?.trim();
  return s ? s : null;
}
