import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { DEMO_COOKIE } from '@/lib/demo-cookie';

/**
 * Protege /painel/*. A verificação de ADMIN (tabela public.admins) é feita no
 * servidor (layout e Server Actions) e no banco (RLS). Aqui só checamos se há
 * sessão, para redirecionar cedo ao login.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPainel = path === '/painel' || path.startsWith('/painel/');

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    return NextResponse.redirect(url);
  };

  if (process.env.DEMO_MODE === 'true') {
    const logado = request.cookies.get(DEMO_COOKIE)?.value === '1';
    if (isPainel && !logado) return redirectTo('/login');
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return NextResponse.next(); // o painel mostra a mensagem de configuração

  const { response, user } = await updateSession(request, url, anonKey);
  if (isPainel && !user) return redirectTo('/login');
  if (path === '/login' && user) return redirectTo('/painel');
  return response;
}

export const config = {
  matcher: ['/painel/:path*', '/painel', '/login'],
};
