import 'server-only';
import { createHash } from 'node:crypto';
import { dispositivoDoUserAgent, normalizarCodigo } from '@/lib/codigo';
import { ipHashSalt, isDemo } from '@/lib/env';
import { createAnonClient } from '@/lib/supabase/server';
import { resolverRedirectSupabase } from '@/lib/data/supabase-repo';
import { resolverRedirectDemo } from '@/lib/data/demo-repo';
import type { Status } from '@/lib/types';

export type ResultadoRedirect =
  | { tipo: 'redirecionar'; url: string }
  | { tipo: 'estado'; motivo: 'aguardando' | 'desativada' | 'nao-encontrada' | 'erro' };

/** Hash diário do IP: permite ignorar leituras repetidas sem guardar o IP. */
export function hashIp(ip: string | null, salt: string | null, dia = new Date().toISOString().slice(0, 10)) {
  if (!ip || !salt) return null;
  return createHash('sha256').update(`${salt}|${dia}|${ip}`).digest('hex').slice(0, 32);
}

export async function resolverCodigo(
  codigoBruto: string,
  meta: { ip: string | null; userAgent: string | null },
): Promise<ResultadoRedirect> {
  const codigo = normalizarCodigo(codigoBruto);
  if (!codigo || codigoBruto.includes('/')) return { tipo: 'estado', motivo: 'nao-encontrada' };

  const ipHash = hashIp(meta.ip, ipHashSalt());
  const dispositivo = dispositivoDoUserAgent(meta.userAgent);

  let r: { status: Status; destino_url: string | null } | null;
  try {
    r = isDemo()
      ? resolverRedirectDemo(codigo, ipHash, dispositivo)
      : await resolverRedirectSupabase(createAnonClient(), codigo, ipHash, dispositivo);
  } catch (e) {
    console.error('[redirect] falha ao consultar', codigo, e instanceof Error ? e.message : e);
    return { tipo: 'estado', motivo: 'erro' };
  }

  if (!r) return { tipo: 'estado', motivo: 'nao-encontrada' };
  if (r.status === 'desativada') return { tipo: 'estado', motivo: 'desativada' };
  // Defesa extra: só redireciona para HTTPS, mesmo que o banco devolva outra coisa.
  if (r.status !== 'ativa' || !r.destino_url || !/^https:\/\//i.test(r.destino_url)) {
    return { tipo: 'estado', motivo: 'aguardando' };
  }
  return { tipo: 'redirecionar', url: r.destino_url };
}
