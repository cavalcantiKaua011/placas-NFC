import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createPlainClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { requireSupabaseEnv } from '@/lib/env';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** Cliente com a sessão do administrador (Server Components, Server Actions, Route Handlers). */
export function createClient() {
  const { url, anonKey } = requireSupabaseEnv();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem gravar cookies; o middleware renova a sessão.
        }
      },
    },
  });
}

/** Cliente anônimo, sem sessão (usado apenas pela rota pública /r/[codigo]). */
export function createAnonClient() {
  const { url, anonKey } = requireSupabaseEnv();
  return createPlainClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
