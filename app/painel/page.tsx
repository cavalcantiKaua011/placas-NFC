import Link from 'next/link';
import { ArrowUpRight, Ban, CheckCircle2, Clock, Layers, ScanLine, Search, UserPlus, Wand2 } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { DISPOSITIVO_LABEL, formatNumber, timeAgo } from '@/lib/format';

export const metadata = { title: 'Visão geral' };
export const dynamic = 'force-dynamic';

const DIAS = 14;

export default async function VisaoGeral() {
  const { repo } = await paginaAdmin();
  const [s, serie, ultimas] = await Promise.all([repo.stats(), repo.leiturasPorDia(DIAS), repo.ultimasLeituras(6)]);

  const max = Math.max(1, ...serie.map((d) => d.total));
  const totalPeriodo = serie.reduce((a, d) => a + d.total, 0);

  const indicadores = [
    { label: 'Total de plaquinhas', valor: s.total, icon: Layers, href: '/painel/plaquinhas', cor: 'text-zinc-400' },
    { label: 'Ativas', valor: s.ativas, icon: CheckCircle2, href: '/painel/plaquinhas?status=ativa', cor: 'text-emerald-400' },
    { label: 'Aguardando configuração', valor: s.aguardando, icon: Clock, href: '/painel/plaquinhas?status=aguardando', cor: 'text-amber-400' },
    { label: 'Desativadas', valor: s.desativadas, icon: Ban, href: '/painel/plaquinhas?status=desativada', cor: 'text-zinc-500' },
    { label: 'Leituras registradas', valor: s.leituras, icon: ScanLine, href: '/painel/acessos', cor: 'text-accent' },
  ];

  const atalhos = [
    { href: '/painel/configurar', label: 'Configurar plaquinha', desc: 'Vincular cliente e definir destino', icon: Wand2 },
    { href: '/painel/clientes?novo=1', label: 'Cadastrar cliente', desc: 'Novo estabelecimento', icon: UserPlus },
    { href: '/painel/plaquinhas', label: 'Localizar plaquinha', desc: 'Buscar por código ou cliente', icon: Search },
  ];

  return (
    <>
      <PageHeader title="Visão geral" description="Resumo das suas plaquinhas e leituras." />

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {indicadores.map(({ label, valor, icon: Icon, href, cor }, i) => (
          <Link
            key={label}
            href={href}
            className={`card p-4 transition hover:border-zinc-600 ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] leading-tight text-muted">{label}</span>
              <Icon className={`h-4 w-4 shrink-0 ${cor}`} strokeWidth={1.9} aria-hidden />
            </div>
            <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">{formatNumber(valor)}</p>
          </Link>
        ))}
      </section>

      <section aria-label="Atalhos" className="mt-6 grid gap-3 sm:grid-cols-3">
        {atalhos.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href} className="card group flex items-center gap-3 p-4 transition hover:border-accent/40">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-zinc-100">{label}</span>
              <span className="block truncate text-xs text-muted">{desc}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-zinc-600 transition group-hover:text-accent" aria-hidden />
          </Link>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card
          className="lg:col-span-3"
          title={`Leituras nos últimos ${DIAS} dias`}
          actions={<span className="text-sm tabular-nums text-muted">{formatNumber(totalPeriodo)}</span>}
        >
          {totalPeriodo === 0 ? (
            <p className="py-14 text-center text-sm text-muted">Nenhuma leitura no período.</p>
          ) : (
            <>
              <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Gráfico de leituras por dia, total ${totalPeriodo}`}>
                {serie.map(({ dia, total }) => (
                  <div key={dia} className="group relative flex h-full flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-[3px] bg-accent/70 transition group-hover:bg-accent"
                      style={{ height: `${Math.max((total / max) * 100, total > 0 ? 4 : 1.5)}%`, opacity: total > 0 ? 1 : 0.25 }}
                    />
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-elevated px-2 py-1 text-xs text-zinc-200 group-hover:block">
                      {dia.slice(8, 10)}/{dia.slice(5, 7)} · {total}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-zinc-500">
                <span>
                  {serie[0]?.dia.slice(8, 10)}/{serie[0]?.dia.slice(5, 7)}
                </span>
                <span>Hoje</span>
              </div>
            </>
          )}
        </Card>

        <Card
          className="lg:col-span-2"
          title="Últimas leituras"
          bodyClassName=""
          actions={
            <Link href="/painel/acessos" className="flex items-center gap-1 text-xs text-muted hover:text-zinc-200">
              Ver histórico <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        >
          {ultimas.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              Nenhuma leitura ainda. Elas aparecem aqui quando alguém lê uma plaquinha ativa.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {ultimas.map((a) => (
                <li key={a.id}>
                  <Link href={`/painel/plaquinhas/${a.plaque_id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-900/60">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] text-zinc-200">{a.codigo_publico}</p>
                      <p className="truncate text-xs text-muted">{a.nome_empresa ?? 'Sem cliente'}</p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="text-zinc-300">{timeAgo(a.data_hora)}</p>
                      <p className="text-zinc-500">{DISPOSITIVO_LABEL[a.dispositivo ?? ''] ?? '—'}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
