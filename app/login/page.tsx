import Link from 'next/link';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { isDemo, supabaseEnv } from '@/lib/env';
import { Logo } from '@/components/ui/Logo';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Entrar' };
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const demo = isDemo();
  const configurado = Boolean(supabaseEnv());

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(34,197,94,0.14),transparent)]"
      />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar ao site
        </Link>
        <Logo className="mb-6" />
        <div className="card p-6">
          {demo ? (
            <>
              <div className="flex items-center gap-2 text-amber-300">
                <FlaskConical className="h-4 w-4" aria-hidden />
                <h1 className="text-base font-semibold">Modo demonstração</h1>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Este ambiente usa <strong className="text-zinc-200">dados fictícios em memória</strong>. Não há conexão
                com o banco real; tudo que você criar aqui pode ser apagado a qualquer momento.
              </p>
              <form action="/demo/entrar" method="post" className="mt-6">
                <button type="submit" className="btn-accent h-10 w-full">
                  Entrar na demonstração
                </button>
              </form>
            </>
          ) : configurado ? (
            <>
              <h1 className="text-lg font-semibold tracking-tight">Entrar no painel</h1>
              <p className="mt-1 text-sm text-muted">Acesso restrito ao administrador.</p>
              <LoginForm />
            </>
          ) : (
            <>
              <h1 className="text-base font-semibold">Supabase não configurado</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Defina <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_URL</code> e{' '}
                <code className="text-zinc-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no arquivo{' '}
                <code className="text-zinc-300">.env.local</code>, ou rode com{' '}
                <code className="text-zinc-300">DEMO_MODE=true</code> para ver a demonstração.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
