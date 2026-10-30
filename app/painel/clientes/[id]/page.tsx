import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MessageCircle, Nfc, Wand2 } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { DESTINOS } from '@/lib/destino';
import { formatDate, formatNumber, onlyDigits, timeAgo } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EditarClienteForm, ExcluirCliente } from '@/components/painel/ClienteForm';

export const metadata = { title: 'Cliente' };
export const dynamic = 'force-dynamic';

export default async function ClientePage({ params }: { params: { id: string } }) {
  const { repo } = await paginaAdmin();
  if (!/^[\w-]{1,64}$/.test(params.id)) notFound();
  const c = await repo.obterCliente(params.id);
  if (!c) notFound();
  const plaquinhas = await repo.plaquinhasDoCliente(c.id);

  return (
    <>
      <Link href="/painel/clientes" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Clientes
      </Link>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-zinc-50">{c.nome_empresa}</h1>
          <p className="mt-1 text-sm text-muted">Cliente desde {formatDate(c.data_criacao)}</p>
        </div>
        {c.whatsapp && (
          <a href={`https://wa.me/${onlyDigits(c.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            <MessageCircle className="h-4 w-4" aria-hidden /> Abrir WhatsApp
          </a>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card title="Dados do cliente">
            <EditarClienteForm key={JSON.stringify(c)} cliente={c} />
          </Card>
          <Card title="Zona de risco">
            <ExcluirCliente id={c.id} nome={c.nome_empresa} plaquinhas={c.total_plaquinhas} />
          </Card>
        </div>

        <Card className="lg:col-span-2" title={`Plaquinhas vinculadas (${plaquinhas.length})`} bodyClassName="">
          {plaquinhas.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Nfc className="mx-auto h-5 w-5 text-zinc-500" aria-hidden />
              <p className="mt-2 text-sm text-muted">Nenhuma plaquinha vinculada.</p>
              <Link href="/painel/configurar" className="btn-secondary mt-4">
                <Wand2 className="h-4 w-4" aria-hidden /> Configurar plaquinha
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {plaquinhas.map((p) => (
                <li key={p.id}>
                  <Link href={`/painel/plaquinhas/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-zinc-900/60">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] font-medium text-zinc-100">{p.codigo_publico}</p>
                      <p className="truncate text-xs text-muted">
                        {p.destino_tipo ? DESTINOS[p.destino_tipo].label : 'Sem destino'} · {formatNumber(p.total_leituras)} leituras · {timeAgo(p.ultimo_acesso)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} short />
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
