/** Regras dos códigos das plaquinhas. Sem dependências de servidor: pode ser usado no navegador. */

export const ALFABETO_CODIGO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODIGO_PUBLICO_RE = /^[A-Z0-9-]{4,32}$/;

/**
 * Aceita o código puro ("k7m2qx9p"), com espaços, ou a URL inteira lida do QR
 * ("https://dominio.com/r/K7M2QX9P?x=1") e devolve o código normalizado.
 */
export function normalizarCodigo(entrada: string | null | undefined): string | null {
  if (!entrada) return null;
  let v = entrada.trim();
  const m = /\/r\/([^/?#\s]+)/i.exec(v);
  if (m) v = m[1];
  v = v.replace(/\s+/g, '').toUpperCase();
  return CODIGO_PUBLICO_RE.test(v) ? v : null;
}

/** Gera um código aleatório de 8 caracteres (mesmo alfabeto do banco). */
export function gerarCodigoPublico(tamanho = 8): string {
  const bytes = new Uint8Array(tamanho);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALFABETO_CODIGO[b % ALFABETO_CODIGO.length];
  return out;
}

export type Dispositivo = 'ios' | 'android' | 'desktop' | 'outro';

export function dispositivoDoUserAgent(ua: string | null | undefined): Dispositivo {
  if (!ua) return 'outro';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows NT|Macintosh|X11|CrOS/i.test(ua)) return 'desktop';
  return 'outro';
}

/** Separa uma lista colada (linhas, vírgulas, ponto e vírgula) em códigos válidos e inválidos. */
export function analisarListaCodigos(texto: string): { validos: string[]; invalidos: string[] } {
  const partes = texto
    .split(/[\n,;\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const validos = new Set<string>();
  const invalidos: string[] = [];
  for (const p of partes) {
    const c = normalizarCodigo(p);
    if (c) validos.add(c);
    else invalidos.push(p);
  }
  return { validos: Array.from(validos), invalidos };
}
