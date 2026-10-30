import Link from 'next/link';
import { FlaskConical, ShieldAlert } from 'lucide-react';
import { obterSessao } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { Sidebar } from '@/components/painel/Sidebar';
import { sair } from './actions';

export const dynamic = 'force-dynamic';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await obterSessao();

  if (sessao.estado === 'anonimo') redirect('/login');

  if (sessao.estado === 'sem-config') {
    return (
      <Aviso titulo="Supabase não configurado">
        Defina <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> no{' '}
        <code>.env.local</code> (ou na Vercel). Para apenas visualizar, use <code>DEMO_MODE=true</code>.
      </Aviso>
    );
  }

  if (sessao.estado === 'proibido') {
    return (
      <Aviso titulo="Acesso restrito">
        O usuário <span className="text-zinc-200">{sessao.email}</span> está autenticado, mas não está cadastrado como
        administrador (tabela <code>public.admins</code>).
        <form action={sair} className="mt-6">
          <button type="submit" className="btn-secondary">Sair</button>
        </form>
      </Aviso>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar email={sessao.email} />
      <div className="min-w-0 flex-1">
        {sessao.demo && (
          <div role="note" className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200 md:px-8">
            <FlaskConical className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
            <strong>Modo demonstração:</strong> dados fictícios em memória. Nada é gravado no banco real e os dados podem
            ser reiniciados a qualquer momento.{' '}
            <Link href="/painel/configuracoes" className="underline underline-offset-2">Saiba mais</Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <Logo className="mb-8 justify-center" />
        <ShieldAlert className="mx-auto h-6 w-6 text-amber-400" aria-hidden />
        <h1 className="mt-3 text-lg font-semibold">{titulo}</h1>
        <div className="mt-2 text-sm leading-relaxed text-muted [&_code]:text-zinc-300">{children}</div>
      </div>
    </main>
  );
}
