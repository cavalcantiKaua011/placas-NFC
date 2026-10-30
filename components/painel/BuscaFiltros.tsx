'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Search } from 'lucide-react';

export interface OpcaoFiltro {
  value: string;
  label: string;
  count?: number;
}

/** Busca com atraso + abas de filtro, sincronizadas com a URL (?busca=&status=). */
export function BuscaFiltros({
  placeholder,
  opcoes,
  parametro = 'status',
}: {
  placeholder: string;
  opcoes?: OpcaoFiltro[];
  parametro?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [busca, setBusca] = useState(params.get('busca') ?? '');
  const atual = params.get(parametro) ?? '';
  const primeira = useRef(true);

  function aplicar(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete('pagina');
    const qs = sp.toString();
    start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => aplicar({ busca: busca.trim() }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
        <input
          type="search"
          aria-label={placeholder}
          className="input pl-9"
          placeholder={placeholder}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {pending && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" aria-hidden />}
      </div>

      {opcoes && (
        <div role="tablist" aria-label="Filtrar por status" className="flex overflow-x-auto rounded-lg border border-line bg-bg p-0.5">
          {opcoes.map((o) => {
            const sel = atual === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={sel}
                onClick={() => aplicar({ [parametro]: o.value })}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[13px] transition ${
                  sel ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {o.label}
                {o.count !== undefined && (
                  <span className={`rounded px-1 text-[11px] tabular-nums ${sel ? 'bg-zinc-700 text-zinc-200' : 'text-zinc-500'}`}>
                    {o.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
