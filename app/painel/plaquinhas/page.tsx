import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, Nfc, Wand2 } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { getSiteUrl, urlPublica } from '@/lib/site';
import { DESTINOS } from '@/lib/destino';
import { formatNumber, timeAgo } from '@/lib/format';
import { STATUS_LIST, type Status } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { BuscaFiltros } from '@/components/painel/BuscaFiltros';
import { NovaPlaquinhaDialog } from '@/components/painel/NovaPlaquinhaDialog';
import { QrDownload } from '@/components/painel/QrDownload';

export const metadata = { title: 'Minhas Plaquinhas' };
export const dynamic = 'force-dynamic';

const POR_PAGINA = 25;

export default async function PlaquinhasPage({
  searchParams,
}: {
  searchParams: { busca?: string; status?: string; pagina?: string };
}) {
  const { repo } = await paginaAdmin();
  const busca = (searchParams.busca ?? '').slice(0, 60);
  const status = (STATUS_LIST as string[]).includes(searchParams.status ?? '') ? (searchParams.status as Status) : '';
  const pagina = Math.max(1, Math.floor(Number(searchParams.pagina)) || 1);

  const [{ itens, total }, contagem] = await Promise.all([
    repo.listarPlaquinhas({ busca, status, pagina, porPagina: POR_PAGINA }),
    repo.contagemPorStatus(),
  ]);
  const base = getSiteUrl();
  const totalGeral = contagem.ativa + contagem.aguardando + contagem.desativada;
  const filtrando = Boolean(busca || status);

  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (busca) sp.set('busca', busca);
    if (status) sp.set('status', status);
    if (p > 1) sp.set('pagina', String(p));
    const qs = sp.toString();
    return qs ? `/painel/plaquinhas?${qs}` : '/painel/plaquinhas';
  };

  return (
    <>
      <PageHeader
        title="Minhas Plaquinhas"
        description={`${formatNumber(total)} ${total === 1 ? 'plaquinha' : 'plaquinhas'}${filtrando ? ' encontradas' : ''}`}
        actions={
          <>
            <Link href="/painel/configurar" className="btn-secondary">
              <Wand2 className="h-4 w-4" aria-hidden /> Configurar
            </Link>
            <NovaPlaquinhaDialog />
          </>
        }
      />

      <Suspense>
        <BuscaFiltros
          placeholder="Buscar por código, nome ou cliente"
          opcoes={[
            { value: '', label: 'Todas', count: totalGeral },
            { value: 'ativa', label: 'Ativas', count: contagem.ativa },
            { value: 'aguardando', label: 'Aguardando', count: contagem.aguardando },
            { value: 'desativada', label: 'Desativadas', count: contagem.desativada },
          ]}
        />
      </Suspense>

      {itens.length === 0 ? (
        filtrando ? (
          <EmptyState icon={Nfc} title="Nenhuma plaquinha encontrada" description="Ajuste a busca ou escolha outro status." />
        ) : (
          <EmptyState
            icon={Nfc}
            title="Nenhuma plaquinha cadastrada"
            description="Cadastre plaquinhas antes da venda: o sistema gera o código, o link permanente e o QR Code. O destino você configura depois."
            action={<NovaPlaquinhaDialog label="Cadastrar primeira plaquinha" />}
          />
        )
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Lista de plaquinhas</caption>
              <thead>
                <tr className="table-head">
                  <th scope="col" className="px-4 py-3 font-medium">Código</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Destino</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Leituras</th>
                  <th scope="col" className="px-4 py-3 font-medium">Última leitura</th>
                  <th scope="col" className="w-24 px-2 py-3"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {itens.map((p) => (
                  <tr key={p.id} className="transition hover:bg-zinc-900/60">
                    <td className="px-4 py-3">
                      <Link href={`/painel/plaquinhas/${p.id}`} className="font-mono text-[13px] font-medium text-zinc-100 hover:text-accent">
                        {p.codigo_publico}
                      </Link>
                      <p className="font-mono text-[11px] text-zinc-500">{p.codigo}</p>
                    </td>
                    <td className="max-w-[220px] px-4 py-3">
                      {p.nome_empresa ? (
                        <Link href={`/painel/clientes/${p.cliente_id}`} className="block truncate text-zinc-200 hover:text-accent">
                          {p.nome_empresa}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">Sem cliente</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} short /></td>
                    <td className="px-4 py-3 text-muted">{p.destino_tipo ? DESTINOS[p.destino_tipo].label : '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-200">{formatNumber(p.total_leituras)}</td>
                    <td className="px-4 py-3 text-muted">{timeAgo(p.ultimo_acesso)}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {p.status === 'aguardando' && (
                          <Link href={`/painel/configurar?codigo=${p.codigo_publico}`} className="btn-ghost h-8 w-8 px-0" aria-label={`Configurar ${p.codigo_publico}`} title="Configurar">
                            <Wand2 className="h-4 w-4" aria-hidden />
                          </Link>
                        )}
                        <QrDownload url={urlPublica(base, p.codigo_publico)} codigo={p.codigo_publico} compact />
                        <Link href={`/painel/plaquinhas/${p.id}`} className="btn-ghost h-8 w-8 px-0" aria-label={`Abrir ${p.codigo_publico}`}>
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular */}
          <ul className="space-y-2 md:hidden">
            {itens.map((p) => (
              <li key={p.id}>
                <Link href={`/painel/plaquinhas/${p.id}`} className="card block p-4 transition active:bg-zinc-900">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-zinc-100">{p.codigo_publico}</span>
                    <StatusBadge status={p.status} short />
                  </div>
                  <p className="mt-2 truncate text-sm text-zinc-300">{p.nome_empresa ?? 'Sem cliente'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>{p.destino_tipo ? DESTINOS[p.destino_tipo].label : 'Sem destino'}</span>
                    <span className="tabular-nums">
                      {formatNumber(p.total_leituras)} leituras · {timeAgo(p.ultimo_acesso)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination pagina={pagina} total={total} porPagina={POR_PAGINA} href={href} />
        </>
      )}
    </>
  );
}
