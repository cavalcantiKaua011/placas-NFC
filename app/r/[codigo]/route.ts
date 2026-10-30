import { NextResponse, type NextRequest } from 'next/server';
import { resolverCodigo } from '@/lib/redirect';
import { isDemo } from '@/lib/env';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function semCache(res: NextResponse) {
  res.headers.set('Cache-Control', 'no-store, max-age=0');
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
}

/**
 * Rota pública do QR Code / NFC: /r/CODIGO
 * - O destino vem SEMPRE do banco (nunca da URL), então não há redirecionamento aberto.
 * - Não expõe dados do cliente: o visitante só recebe o redirecionamento ou uma página de estado.
 */
export async function GET(request: NextRequest, { params }: { params: { codigo: string } }) {
  let bruto = params.codigo;
  try {
    bruto = decodeURIComponent(params.codigo);
  } catch {
    /* mantém o valor original */
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip');
  const resultado = await resolverCodigo(bruto, { ip: ip ?? null, userAgent: request.headers.get('user-agent') });

  if (resultado.tipo === 'redirecionar') {
    if (isDemo()) {
      // Na demonstração não saímos do site: mostramos para onde a plaquinha levaria.
      const url = new URL(`/r/${encodeURIComponent(bruto.toUpperCase())}/demo`, request.url);
      return semCache(NextResponse.redirect(url, 302));
    }
    return semCache(NextResponse.redirect(resultado.url, 302));
  }

  const destino = new URL(`/indisponivel?motivo=${resultado.motivo}`, request.url);
  return semCache(NextResponse.redirect(destino, 302));
}
