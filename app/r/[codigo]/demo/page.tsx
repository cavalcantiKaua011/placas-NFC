import { notFound } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { normalizarCodigo } from '@/lib/codigo';
import { DemoRepo } from '@/lib/data/demo-repo';
import { Logo } from '@/components/ui/Logo';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Redirecionamento (demonstração)', robots: { index: false } };

export default async function RedirectDemo({ params }: { params: { codigo: string } }) {
  if (!isDemo()) notFound();
  const codigo = normalizarCodigo(params.codigo);
  const p = codigo ? await new DemoRepo().buscarPorCodigo(codigo) : null;
  if (!p || !p.destino_url) notFound();

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-md text-center">
        <Logo className="mb-10 justify-center" />
        <p className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          Modo demonstração
        </p>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Leitura registrada</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Em produção, quem lê a plaquinha <span className="font-mono text-zinc-200">{p.codigo_publico}</span> é
          levado direto para:
        </p>
        <p className="mt-4 break-all rounded-lg border border-line bg-panel px-3 py-2 font-mono text-sm text-zinc-200">
          {p.destino_url}
        </p>
        <p className="mt-4 text-xs text-zinc-500">
          Os destinos da demonstração são fictícios. A leitura aparece no Histórico de acessos do painel.
        </p>
        <a href="/painel/acessos" className="btn-secondary mt-6">
          <ExternalLink className="h-4 w-4" aria-hidden /> Ver histórico de acessos
        </a>
      </div>
    </main>
  );
}
