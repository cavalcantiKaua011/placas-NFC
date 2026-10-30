import { NextResponse, type NextRequest } from 'next/server';
import { isDemo } from '@/lib/env';
import { DEMO_COOKIE } from '@/lib/demo-cookie';

/** Entra na demonstração (somente com DEMO_MODE=true). Não dá acesso a nenhum dado real. */
export async function POST(request: NextRequest) {
  if (!isDemo()) return new NextResponse('Not found', { status: 404 });
  const res = NextResponse.redirect(new URL('/painel', request.url), 303);
  res.cookies.set(DEMO_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
  return res;
}
