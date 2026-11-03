'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Wand2, X } from 'lucide-react';
import { DESTINOS } from '@/lib/destino';
import { formatNumber, timeAgo } from '@/lib/format';
import type { PlaquinhaItem } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { QrDownload } from './QrDownload';
import { BotaoGerarPptx, GerarPptxDialog } from './GerarPptxDialog';

const url = (base: string, codigo: string) => `${base}/r/${codigo}`;

function Caixa({ checked, onChange, label, indeterminate = false }: { checked: boolean; onChange: () => void; label: string; indeterminate?: boolean }) {
  return (
    <input
      type="checkbox"
      className="h-4 w-4 cursor-pointer rounded border-line accent-green-500"
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
    />
  );
}

/** Lista de plaquinhas com seleção (para gerar o PowerPoint de impressão). */
export function ListaPlaquinhas({
  itens,
  base,
  totalFiltro,
  filtro,
  demo,
}: {
  itens: PlaquinhaItem[];
  base: string;
  totalFiltro: number;
  filtro: { busca: string; status: string };
  demo: boolean;
}) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const [abertura, setAbertura] = useState(0);

  // Ao mudar de página/filtro, mantém só as selecionadas que ainda estão visíveis
  const idsVisiveis = useMemo(() => itens.map((p) => p.id).join(','), [itens]);
  useEffect(() => {
    setSel((s) => new Set(Array.from(s).filter((id) => itens.some((p) => p.id === id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsVisiveis]);

  const todasPagina = itens.length > 0 && itens.every((p) => sel.has(p.id));
  const algumas = sel.size > 0 && !todasPagina;

  const alternar = (id: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const alternarPagina = () => setSel(todasPagina ? new Set() : new Set(itens.map((p) => p.id)));

  const abrir = () => {
    setAbertura((k) => k + 1);
    setAberto(true);
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted" aria-live="polite">
          {sel.size > 0 ? (
            <>
              <strong className="text-zinc-100">{sel.size}</strong> selecionada(s)
              <button type="button" className="btn-ghost ml-2 h-7 px-2 text-xs" onClick={() => setSel(new Set())}>
                <X className="h-3.5 w-3.5" aria-hidden /> Limpar
              </button>
            </>
          ) : (
            'Marque as plaquinhas para gerar o arquivo de impressão.'
          )}
        </p>
        <BotaoGerarPptx onClick={abrir} quantidade={sel.size || undefined} />
      </div>

      {/* Desktop */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Lista de plaquinhas</caption>
          <thead>
            <tr className="table-head">
              <th scope="col" className="w-10 py-3 pl-4">
                <Caixa checked={todasPagina} indeterminate={algumas} onChange={alternarPagina} label="Selecionar todas desta página" />
              </th>
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
              <tr key={p.id} className={`transition hover:bg-zinc-900/60 ${sel.has(p.id) ? 'bg-accent-soft/40' : ''}`}>
                <td className="py-3 pl-4">
                  <Caixa checked={sel.has(p.id)} onChange={() => alternar(p.id)} label={`Selecionar ${p.codigo_publico}`} />
                </td>
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
                    <QrDownload url={url(base, p.codigo_publico)} codigo={p.codigo_publico} compact />
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
      <div className="mb-2 flex items-center gap-2 px-1 md:hidden">
        <Caixa checked={todasPagina} indeterminate={algumas} onChange={alternarPagina} label="Selecionar todas desta página" />
        <span className="text-sm text-muted">Selecionar todas desta página</span>
      </div>
      <ul className="space-y-2 md:hidden">
        {itens.map((p) => (
          <li key={p.id} className={`card flex items-start gap-3 p-4 ${sel.has(p.id) ? 'border-accent/50' : ''}`}>
            <div className="pt-0.5">
              <Caixa checked={sel.has(p.id)} onChange={() => alternar(p.id)} label={`Selecionar ${p.codigo_publico}`} />
            </div>
            <Link href={`/painel/plaquinhas/${p.id}`} className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-medium text-zinc-100">{p.codigo_publico}</span>
                <StatusBadge status={p.status} short />
              </div>
              <p className="mt-2 truncate text-sm text-zinc-300">{p.nome_empresa ?? 'Sem cliente'}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
                <span>{p.destino_tipo ? DESTINOS[p.destino_tipo].label : 'Sem destino'}</span>
                <span className="tabular-nums">
                  {formatNumber(p.total_leituras)} leituras · {timeAgo(p.ultimo_acesso)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <GerarPptxDialog
        key={abertura}
        open={aberto}
        onClose={() => setAberto(false)}
        selecionadas={Array.from(sel)}
        totalFiltro={totalFiltro}
        filtro={filtro}
        origemInicial={sel.size ? 'selecionadas' : 'filtro'}
        demo={demo}
      />
    </>
  );
}
