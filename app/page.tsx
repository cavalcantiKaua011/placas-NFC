import Link from 'next/link';
import { ArrowRight, BarChart3, Link2, Nfc, QrCode, ShieldCheck, Users, Wand2 } from 'lucide-react';
import { isDemo } from '@/lib/env';
import { Logo } from '@/components/ui/Logo';

export const dynamic = 'force-static';
export const revalidate = false;

const passos = [
  { icon: QrCode, titulo: 'Cadastre antes de vender', texto: 'Gere códigos únicos com link permanente e QR Code pronto para impressão.' },
  { icon: Wand2, titulo: 'Configure na venda', texto: 'Localize ou escaneie a plaquinha, vincule o cliente e escolha o destino.' },
  { icon: Link2, titulo: 'Troque quando quiser', texto: 'O link impresso nunca muda. Só o destino é atualizado no painel.' },
  { icon: BarChart3, titulo: 'Acompanhe as leituras', texto: 'Veja quantas vezes cada plaquinha foi lida, por dia e por cliente.' },
];

const recursos = [
  { icon: Nfc, titulo: 'NFC e QR Code', texto: 'Um único link serve para gravar o chip e para o QR impresso.' },
  { icon: Users, titulo: 'Clientes organizados', texto: 'Estabelecimentos, contatos e plaquinhas vinculadas em um só lugar.' },
  { icon: ShieldCheck, titulo: 'Seguro por padrão', texto: 'Painel restrito ao administrador, destinos somente HTTPS e leituras sem dados pessoais.' },
];

// Dados ILUSTRATIVOS (fixos) — não vêm do banco.
const exemplo = [
  { codigo: 'K7M2QX9P', cliente: 'Padaria Exemplo', status: 'Ativa', cor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', leituras: 128 },
  { codigo: 'H4WT8RZB', cliente: 'Barbearia Exemplo', status: 'Ativa', cor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30', leituras: 87 },
  { codigo: 'P9NC3FVE', cliente: '—', status: 'Aguardando', cor: 'text-amber-300 bg-amber-500/10 border-amber-500/30', leituras: 0 },
  { codigo: 'T6JX2DAU', cliente: 'Café Exemplo', status: 'Desativada', cor: 'text-zinc-400 bg-zinc-700/20 border-zinc-600/50', leituras: 41 },
];

export default function Home() {
  const demo = isDemo();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
          <Logo href="/" />
          <Link href="/login" className="btn-secondary">
            {demo ? 'Ver demonstração' : 'Acessar painel'}
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(50%_60%_at_50%_0%,rgba(34,197,94,0.13),transparent)]" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center md:px-8 md:pt-24">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden /> Plaquinhas NFC e QR Code para avaliações
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 md:text-5xl">
              Suas plaquinhas sob controle, do estoque à leitura.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg">
              Cadastre plaquinhas antes da venda, vincule cada uma a um cliente e defina para onde ela leva — Google, Instagram,
              WhatsApp ou cardápio. Mude o destino a qualquer momento, sem reimprimir.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="btn-accent h-11 px-5 text-[15px]">
                {demo ? 'Entrar na demonstração' : 'Acessar painel'} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <a href="#como-funciona" className="btn-secondary h-11 px-5 text-[15px]">Como funciona</a>
            </div>

            {/* Ilustração do painel */}
            <figure className="mx-auto mt-14 max-w-4xl text-left">
              <div className="card overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-1.5 border-b border-line px-4 py-3" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                  <span className="ml-3 text-xs text-zinc-500">Minhas Plaquinhas</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                  {[['Total', '24'], ['Ativas', '17'], ['Aguardando', '5'], ['Leituras', '1.284']].map(([l, v]) => (
                    <div key={l} className="rounded-lg border border-line bg-bg p-3">
                      <p className="text-xs text-muted">{l}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{v}</p>
                    </div>
                  ))}
                </div>
                <ul className="divide-y divide-line border-t border-line">
                  {exemplo.map((e) => (
                    <li key={e.codigo} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="w-24 font-mono text-zinc-100">{e.codigo}</span>
                      <span className="min-w-0 flex-1 truncate text-zinc-400">{e.cliente}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${e.cor}`}>{e.status}</span>
                      <span className="hidden w-20 text-right tabular-nums text-zinc-400 sm:block">{e.leituras} leituras</span>
                    </li>
                  ))}
                </ul>
              </div>
              <figcaption className="mt-3 text-center text-xs text-zinc-500">Ilustração com dados fictícios.</figcaption>
            </figure>
          </div>
        </section>

        <section id="como-funciona" className="border-t border-line/60 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Como funciona</h2>
            <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {passos.map(({ icon: Icon, titulo, texto }, i) => (
                <li key={titulo} className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-soft text-accent">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="font-mono text-xs text-zinc-600">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-medium text-zinc-100">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line/60 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-3 md:px-8">
            {recursos.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className="p-2">
                <Icon className="h-5 w-5 text-accent" aria-hidden />
                <h3 className="mt-3 font-medium text-zinc-100">{titulo}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{texto}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line/60 py-16">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center md:px-8">
            <h2 className="text-2xl font-semibold tracking-tight">Pronto para organizar suas plaquinhas?</h2>
            <Link href="/login" className="btn-accent h-11 px-5">
              {demo ? 'Entrar na demonstração' : 'Acessar painel'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-zinc-500 sm:flex-row md:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Placas NFC</p>
        </div>
      </footer>
    </div>
  );
}
