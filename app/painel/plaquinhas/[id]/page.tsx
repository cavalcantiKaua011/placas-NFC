import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, ExternalLink, Info, Nfc, QrCode } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { getSiteUrl, urlPublica } from '@/lib/site';
import { qrSvg } from '@/lib/qr';
import { DISPOSITIVO_LABEL, formatBRL, formatDate, formatDateTime, formatNumber, timeAgo } from '@/lib/format';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CopyButton } from '@/components/ui/CopyButton';
import { Card } from '@/components/ui/Card';
import { QrDownload } from '@/components/painel/QrDownload';
import { DestinoForm } from '@/components/painel/DestinoForm';
import { VinculoForm } from '@/components/painel/VinculoForm';
import { VendaForm } from '@/components/painel/VendaForm';
import { AcoesPlaquinha } from '@/components/painel/AcoesPlaquinha';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plaquinha' };

export default async function PlaquinhaPage({ params }: { params: { id: string } }) {
  const { repo, demo } = await paginaAdmin();
  if (!/^[\w-]{1,64}$/.test(params.id)) notFound();
  const p = await repo.obterPlaquinha(params.id);
  if (!p) notFound();

  const [eventos, clientes, leituras] = await Promise.all([
    repo.listarEventos(p.id),
    repo.listarClientes(),
    repo.listarAcessos({ codigo: p.codigo_publico, pagina: 1, porPagina: 8 }),
  ]);
  const link = urlPublica(getSiteUrl(), p.codigo_publico);
  const svg = await qrSvg(link);

  return (
    <>
      <Link href="/painel/plaquinhas" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Minhas Plaquinhas
      </Link>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight text-zinc-50">{p.codigo_publico}</h1>
            <StatusBadge status={p.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            Etiqueta interna <span className="font-mono text-zinc-400">{p.codigo}</span> · criada em {formatDate(p.data_criacao)}
          </p>
        </div>
        {p.status === 'aguardando' && (
          <Link href={`/painel/configurar?codigo=${p.codigo_publico}`} className="btn-accent">
            Configurar agora
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna lateral */}
        <div className="space-y-6 lg:order-2">
          <Card title={<span className="inline-flex items-center gap-2"><QrCode className="h-4 w-4 text-zinc-400" aria-hidden /> QR Code</span>}>
            <div
              className="mx-auto w-full max-w-[220px] overflow-hidden rounded-lg bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
              role="img"
              aria-label={`QR Code que leva a ${link}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            <div className="mt-4 flex items-center gap-1 rounded-lg border border-line bg-bg py-1 pl-3 pr-1">
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-300" title={link}>{link}</span>
              <CopyButton value={link} />
            </div>
            <div className="mt-3 space-y-2">
              <QrDownload url={link} codigo={p.codigo_publico} />
              <a href={`/r/${p.codigo_publico}`} target="_blank" rel="noopener" className="btn-secondary w-full">
                <ExternalLink className="h-4 w-4" aria-hidden /> Testar redirecionamento
              </a>
            </div>
            <p className="hint">O teste conta como uma leitura{demo ? '' : ' quando a plaquinha está ativa'}.</p>
          </Card>

          <Card title={<span className="inline-flex items-center gap-2"><Nfc className="h-4 w-4 text-zinc-400" aria-hidden /> Chip NFC</span>}>
            <p className="text-sm text-muted">
              Gravar o chip é diferente de ler o QR Code. Use um app de gravação NFC (ex.: NFC Tools) e grave um registro do tipo{' '}
              <strong className="text-zinc-200">URL</strong> com o link acima. Faça isso uma única vez: o link nunca muda, só o destino.
            </p>
          </Card>

          <Card title="Leituras">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-muted">Total</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{formatNumber(p.total_leituras)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Última</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-200">{timeAgo(p.ultimo_acesso)}</dd>
                <dd className="text-xs text-zinc-500">{formatDateTime(p.ultimo_acesso)}</dd>
              </div>
            </dl>
          </Card>

          <Card title="Ações">
            <AcoesPlaquinha id={p.id} codigo={p.codigo_publico} status={p.status} temDestino={Boolean(p.destino_url)} />
          </Card>
        </div>

        {/* Coluna principal */}
        <div className="space-y-6 lg:order-1 lg:col-span-2">
          <Card
            title="Destino"
            description="Para onde a pessoa vai ao ler o QR Code ou aproximar o celular. Somente endereços HTTPS. Ao salvar pela primeira vez, a plaquinha é ativada."
          >
            <DestinoForm key={p.destino_url ?? 'novo'} id={p.id} tipo={p.destino_tipo} valor={p.destino_valor} url={p.destino_url} />
          </Card>

          <Card title="Cliente">
            <VinculoForm
              key={p.cliente_id ?? 'sem'}
              id={p.id}
              codigoPublico={p.codigo_publico}
              clienteAtual={p.cliente_id ? { id: p.cliente_id, nome: p.nome_empresa ?? '' } : null}
              clientes={clientes.map((c) => ({ id: c.id, nome_empresa: c.nome_empresa }))}
            />
          </Card>

          <Card
            title="Venda"
            description={p.valor_venda !== null ? `Atual: ${formatBRL(p.valor_venda)} em ${formatDate(p.data_venda)}` : 'Opcional: registre quando e por quanto foi vendida.'}
          >
            <VendaForm key={`${p.data_venda}-${p.valor_venda}`} id={p.id} dataVenda={p.data_venda} valorVenda={p.valor_venda} />
          </Card>

          <Card
            title="Leituras recentes"
            bodyClassName=""
            actions={
              leituras.total > 0 ? (
                <Link href={`/painel/acessos?codigo=${p.codigo_publico}`} className="flex items-center gap-1 text-xs text-muted hover:text-zinc-200">
                  Ver todas <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              ) : undefined
            }
          >
            {leituras.itens.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">Nenhuma leitura registrada.</p>
            ) : (
              <ul className="divide-y divide-line">
                {leituras.itens.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-2.5 text-sm">
                    <span className="text-zinc-200">{formatDateTime(a.data_hora)}</span>
                    <span className="text-xs text-muted">{DISPOSITIVO_LABEL[a.dispositivo ?? ''] ?? '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Histórico de alterações" bodyClassName="">
            {eventos.length === 0 ? (
              <p className="flex items-center justify-center gap-2 px-5 py-8 text-sm text-muted">
                <Info className="h-4 w-4" aria-hidden /> Nenhuma alteração registrada.
              </p>
            ) : (
              <ol className="divide-y divide-line">
                {eventos.map((e) => (
                  <li key={e.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="min-w-0 break-words text-zinc-200">{e.descricao}</span>
                    <span className="shrink-0 text-xs text-zinc-500">{formatDateTime(e.criado_em)}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
