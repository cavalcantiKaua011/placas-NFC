import { headers } from 'next/headers';

/** URL base pública (ex.: https://meudominio.com), sem barra final. */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && !env.includes('SEU-DOMINIO')) return env.replace(/\/+$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function siteUrlConfigurada(): boolean {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return Boolean(env && !env.includes('SEU-DOMINIO'));
}

export function urlPublica(base: string, codigoPublico: string) {
  return `${base}/r/${codigoPublico}`;
}
