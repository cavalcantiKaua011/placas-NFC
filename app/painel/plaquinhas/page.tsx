import Link from 'next/link';
import { Suspense } from 'react';
import { Nfc, Wand2 } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { getSiteUrl } from '@/lib/site';
import { formatNumber } from '@/lib/format';
import { STATUS_LIST, type Status } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { BuscaFiltros } from '@/components/painel/BuscaFiltros';
import { NovaPlaquinhaDialog } from '@/components/painel/NovaPlaquinhaDialog';
import { ListaPlaquinhas } from '@/components/painel/ListaPlaquinhas';

export const metadata = { title: 'Minhas Plaquinhas' };
export const dynamic = 'force-dynamic';

const POR_PAGINA = 25;

export default async function PlaquinhasPage({
  searchParams,
}: {
  searchParams: { busca?: string; status?: string; pagina?: string };
}) {
  const { repo, demo } = await paginaAdmin();
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
          <ListaPlaquinhas itens={itens} base={base} totalFiltro={total} filtro={{ busca, status }} demo={demo} />

          <Pagination pagina={pagina} total={total} porPagina={POR_PAGINA} href={href} />
        </>
      )}
    </>
  );
}
