import Link from 'next/link';
import { History, Info } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { DISPOSITIVO_LABEL, formatDateTime, formatNumber, hojeISO } from '@/lib/format';
import { normalizarCodigo } from '@/lib/codigo';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';

export const metadata = { title: 'Histórico de acessos' };
export const dynamic = 'force-dynamic';

const POR_PAGINA = 50;
const dataValida = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export default async function AcessosPage({
  searchParams,
}: {
  searchParams: { de?: string; ate?: string; codigo?: string; pagina?: string };
}) {
  const { repo } = await paginaAdmin();
  const de = dataValida(searchParams.de);
  const ate = dataValida(searchParams.ate);
  const codigo = normalizarCodigo(searchParams.codigo) ?? '';
  const pagina = Math.max(1, Math.floor(Number(searchParams.pagina)) || 1);
  const { itens, total } = await repo.listarAcessos({ de, ate, codigo, pagina, porPagina: POR_PAGINA });
  const filtrando = Boolean(de || ate || codigo);

  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (de) sp.set('de', de);
    if (ate) sp.set('ate', ate);
    if (codigo) sp.set('codigo', codigo);
    if (p > 1) sp.set('pagina', String(p));
    const qs = sp.toString();
    return qs ? `/painel/acessos?${qs}` : '/painel/acessos';
  };

  return (
    <>
      <PageHeader title="Histórico de acessos" description={`${formatNumber(total)} ${total === 1 ? 'leitura' : 'leituras'}${filtrando ? ' no filtro' : ''}`} />

      <form method="get" className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_1.4fr_auto] sm:items-end">
        <div>
          <label className="label" htmlFor="de">De</label>
          <input id="de" name="de" type="date" defaultValue={de} max={hojeISO()} className="input [color-scheme:dark]" />
        </div>
        <div>
          <label className="label" htmlFor="ate">Até</label>
          <input id="ate" name="ate" type="date" defaultValue={ate} max={hojeISO()} className="input [color-scheme:dark]" />
        </div>
        <div>
          <label className="label" htmlFor="codigo">Plaquinha</label>
          <input id="codigo" name="codigo" defaultValue={codigo} className="input font-mono uppercase placeholder:font-sans placeholder:normal-case" placeholder="Código (ex.: K7M2QX9P)" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary h-10 flex-1">Filtrar</button>
          {filtrando && <Link href="/painel/acessos" className="btn-ghost h-10">Limpar</Link>}
        </div>
      </form>

      <p className="mb-4 flex items-start gap-2 text-xs text-zinc-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Registramos apenas data/hora e o tipo de aparelho. Não coletamos localização, nome ou IP do visitante. Leituras repetidas do
        mesmo aparelho em menos de 30 segundos contam uma vez.
      </p>

      {itens.length === 0 ? (
        <EmptyState
          icon={History}
          title={filtrando ? 'Nenhuma leitura no filtro' : 'Nenhuma leitura registrada'}
          description={filtrando ? 'Ajuste o período ou o código.' : 'As leituras aparecem aqui quando alguém lê uma plaquinha ativa (QR Code ou NFC).'}
        />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Leituras registradas</caption>
              <thead>
                <tr className="table-head">
                  <th scope="col" className="px-4 py-3 font-medium">Data e hora</th>
                  <th scope="col" className="px-4 py-3 font-medium">Plaquinha</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Aparelho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {itens.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/60">
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-zinc-200">{formatDateTime(a.data_hora)}</td>
                    <td className="px-4 py-2.5">
                      <Link href={`/painel/plaquinhas/${a.plaque_id}`} className="font-mono text-[13px] text-zinc-100 hover:text-accent">
                        {a.codigo_publico}
                      </Link>
                      <p className="truncate text-xs text-zinc-500 sm:hidden">{a.nome_empresa ?? 'Sem cliente'}</p>
                    </td>
                    <td className="hidden max-w-[240px] truncate px-4 py-2.5 text-zinc-300 sm:table-cell">{a.nome_empresa ?? <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-2.5 text-muted">{DISPOSITIVO_LABEL[a.dispositivo ?? ''] ?? 'Não informado'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagina={pagina} total={total} porPagina={POR_PAGINA} href={href} />
        </>
      )}
    </>
  );
}
