import Link from 'next/link';
import { Suspense } from 'react';
import { ChevronRight, Users } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { formatDate, formatPhone } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { BuscaFiltros } from '@/components/painel/BuscaFiltros';
import { NovoClienteDialog } from '@/components/painel/ClienteForm';

export const metadata = { title: 'Clientes' };
export const dynamic = 'force-dynamic';

export default async function ClientesPage({ searchParams }: { searchParams: { busca?: string; novo?: string } }) {
  const { repo } = await paginaAdmin();
  const busca = (searchParams.busca ?? '').slice(0, 60);
  const clientes = await repo.listarClientes(busca);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} ${clientes.length === 1 ? 'cliente' : 'clientes'}${busca ? ' encontrados' : ''}`}
        actions={<NovoClienteDialog abrirInicial={searchParams.novo === '1'} />}
      />
      <Suspense>
        <BuscaFiltros placeholder="Buscar por nome, contato ou WhatsApp" />
      </Suspense>

      {clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title={busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          description={busca ? 'Tente outro termo.' : 'Cadastre os estabelecimentos que compram suas plaquinhas. Você também pode cadastrar durante a configuração de uma plaquinha.'}
        />
      ) : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Lista de clientes</caption>
              <thead>
                <tr className="table-head">
                  <th scope="col" className="px-4 py-3 font-medium">Estabelecimento</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contato</th>
                  <th scope="col" className="px-4 py-3 font-medium">WhatsApp</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Plaquinhas</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cadastro</th>
                  <th scope="col" className="w-12 px-2 py-3"><span className="sr-only">Abrir</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {clientes.map((c) => (
                  <tr key={c.id} className="transition hover:bg-zinc-900/60">
                    <td className="max-w-[260px] px-4 py-3">
                      <Link href={`/painel/clientes/${c.id}`} className="block truncate font-medium text-zinc-100 hover:text-accent">{c.nome_empresa}</Link>
                      {c.observacoes && <p className="truncate text-xs text-zinc-500">{c.observacoes}</p>}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{c.responsavel ?? '—'}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-300">{formatPhone(c.whatsapp)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-zinc-200">{c.total_plaquinhas}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(c.data_criacao)}</td>
                    <td className="px-2 py-3">
                      <Link href={`/painel/clientes/${c.id}`} className="btn-ghost h-8 w-8 px-0" aria-label={`Abrir ${c.nome_empresa}`}>
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="space-y-2 md:hidden">
            {clientes.map((c) => (
              <li key={c.id}>
                <Link href={`/painel/clientes/${c.id}`} className="card block p-4">
                  <p className="truncate font-medium text-zinc-100">{c.nome_empresa}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted">
                    <span className="truncate">{c.responsavel ?? 'Sem contato'} · {formatPhone(c.whatsapp)}</span>
                    <span className="shrink-0 tabular-nums">{c.total_plaquinhas} plaq.</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
