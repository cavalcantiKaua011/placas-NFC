'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, RotateCcw, Search } from 'lucide-react';
import { configurarPlaquinha, consultarCodigo, type ConsultaCodigo, type ResultadoConfiguracao } from '@/app/painel/actions';
import { CamposDestino } from './DestinoForm';
import { ScannerQr } from './ScannerQr';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import { CopyButton } from '@/components/ui/CopyButton';
import type { DestinoTipo } from '@/lib/types';

type Plaquinha = NonNullable<ConsultaCodigo['plaquinha']>;

function Passo({ n, titulo, ativo, children }: { n: number; titulo: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <section className={`card p-5 transition ${ativo ? '' : 'opacity-60'}`} aria-labelledby={`passo-${n}`}>
      <h2 id={`passo-${n}`} className="mb-4 flex items-center gap-3 text-sm font-medium text-zinc-100">
        <span className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${ativo ? 'bg-accent text-accent-ink' : 'bg-zinc-800 text-zinc-400'}`}>
          {n}
        </span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export function ConfigurarWizard({
  clientes,
  codigoInicial,
  demo,
}: {
  clientes: { id: string; nome_empresa: string }[];
  codigoInicial: string;
  demo: boolean;
}) {
  const [entrada, setEntrada] = useState(codigoInicial);
  const [consulta, setConsulta] = useState<ConsultaCodigo | null>(null);
  const [buscando, startBusca] = useTransition();
  const [modo, setModo] = useState<'existente' | 'novo'>(clientes.length ? 'existente' : 'novo');
  const [clienteId, setClienteId] = useState('');
  const [filtro, setFiltro] = useState('');
  const [state, action] = useFormState<ResultadoConfiguracao, FormData>(configurarPlaquinha, {});
  const [chave, setChave] = useState(0); // reinicia o formulário

  const p: Plaquinha | undefined = consulta?.plaquinha;

  const buscar = useCallback((valor: string) => {
    if (!valor.trim()) return;
    startBusca(async () => {
      const r = await consultarCodigo(valor);
      setConsulta(r);
      if (r.plaquinha?.cliente_id) {
        setModo('existente');
        setClienteId(r.plaquinha.cliente_id);
      }
    });
  }, []);

  useEffect(() => {
    if (codigoInicial) buscar(codigoInicial);
  }, [codigoInicial, buscar]);

  const clientesFiltrados = useMemo(() => {
    const t = filtro.trim().toLowerCase();
    return t ? clientes.filter((c) => c.nome_empresa.toLowerCase().includes(t)) : clientes;
  }, [clientes, filtro]);

  const trocando = Boolean(p?.cliente_id && (modo === 'novo' || (clienteId && clienteId !== p.cliente_id)));

  function recomecar() {
    setEntrada('');
    setConsulta(null);
    setClienteId('');
    setFiltro('');
    setChave((k) => k + 1);
  }

  if (state.ok && state.resultado) {
    const r = state.resultado;
    return (
      <div className="card p-6 text-center sm:p-10" role="status">
        <CheckCircle2 className="mx-auto h-10 w-10 text-accent" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold">Plaquinha {r.codigo_publico} configurada</h2>
        <p className="mt-1 text-sm text-muted">
          Vinculada a <strong className="text-zinc-200">{r.cliente}</strong> e ativa.
          {demo && ' (Demonstração: nada foi gravado no banco real.)'}
        </p>
        <dl className="mx-auto mt-6 max-w-lg space-y-3 text-left text-sm">
          <div className="rounded-lg border border-line bg-bg p-3">
            <dt className="text-xs text-muted">Link da plaquinha (QR / NFC)</dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="min-w-0 flex-1 break-all font-mono text-zinc-200">{r.url_publica}</span>
              <CopyButton value={r.url_publica} />
            </dd>
          </div>
          <div className="rounded-lg border border-line bg-bg p-3">
            <dt className="text-xs text-muted">Redireciona para</dt>
            <dd className="mt-1 break-all font-mono text-zinc-200">{r.destino_url}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <a href={`/r/${r.codigo_publico}`} target="_blank" rel="noopener" className="btn-accent">
            <ExternalLink className="h-4 w-4" aria-hidden /> Testar redirecionamento
          </a>
          <Link href={`/painel/plaquinhas/${r.id}`} className="btn-secondary">Ver plaquinha</Link>
          <button type="button" className="btn-secondary" onClick={() => window.location.assign('/painel/configurar')}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Configurar outra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" key={chave}>
      <Passo n={1} titulo="Localizar a plaquinha" ativo>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            buscar(entrada);
          }}
        >
          <label htmlFor="codigo" className="sr-only">Código da plaquinha</label>
          <input
            id="codigo"
            className="input font-mono uppercase placeholder:font-sans placeholder:normal-case"
            placeholder="Código impresso (ex.: K7M2QX9P) ou link lido do QR"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            autoComplete="off"
            autoFocus={!codigoInicial}
          />
          <button type="submit" className="btn-primary h-10" disabled={buscando || !entrada.trim()}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Search className="h-4 w-4" aria-hidden />}
            Localizar
          </button>
        </form>
        <div className="mt-3">
          <ScannerQr
            onLeitura={(t) => {
              setEntrada(t);
              buscar(t);
            }}
          />
        </div>

        {consulta?.error && (
          <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {consulta.error}
          </p>
        )}

        {p && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-bg p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-lg font-semibold text-zinc-50">{p.codigo_publico}</p>
              <p className="text-xs text-muted">
                {p.codigo} · {p.nome_empresa ? `Cliente atual: ${p.nome_empresa}` : 'Sem cliente'}
              </p>
            </div>
            <StatusBadge status={p.status} />
          </div>
        )}
        {p?.cliente_id && (
          <p className="mt-3 flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Esta plaquinha já está vinculada a {p.nome_empresa}. Você pode atualizar o destino ou transferi-la para outro cliente.
          </p>
        )}
      </Passo>

      <form action={action} className="space-y-4">
        <input type="hidden" name="plaque_id" value={p?.id ?? ''} />
        <input type="hidden" name="cliente_modo" value={modo} />

        <fieldset disabled={!p} className="contents">
          <Passo n={2} titulo="Cliente" ativo={Boolean(p)}>
            <div role="radiogroup" aria-label="Tipo de cliente" className="mb-4 grid grid-cols-2 rounded-lg border border-line bg-bg p-0.5 text-sm">
              {(['existente', 'novo'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={modo === m}
                  onClick={() => setModo(m)}
                  className={`rounded-md py-1.5 transition ${modo === m ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  {m === 'existente' ? 'Cliente existente' : 'Novo cliente'}
                </button>
              ))}
            </div>

            {modo === 'existente' ? (
              clientes.length === 0 ? (
                <p className="text-sm text-muted">Nenhum cliente cadastrado ainda. Use “Novo cliente”.</p>
              ) : (
                <div className="space-y-2">
                  <label className="label" htmlFor="filtro-cliente">Buscar cliente</label>
                  <input id="filtro-cliente" className="input" placeholder="Digite parte do nome" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
                  <label className="sr-only" htmlFor="cliente_id">Cliente</label>
                  <select id="cliente_id" name="cliente_id" className="input" value={clienteId} onChange={(e) => setClienteId(e.target.value)} required>
                    <option value="">Selecione…</option>
                    {clientesFiltrados.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome_empresa}</option>
                    ))}
                  </select>
                </div>
              )
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="novo_nome_empresa">Nome do estabelecimento</label>
                  <input id="novo_nome_empresa" name="novo_nome_empresa" className="input" required minLength={2} maxLength={120} placeholder="Ex.: Padaria Bom Pão" />
                </div>
                <div>
                  <label className="label" htmlFor="novo_responsavel">Contato</label>
                  <input id="novo_responsavel" name="novo_responsavel" className="input" maxLength={120} placeholder="Nome do responsável" />
                </div>
                <div>
                  <label className="label" htmlFor="novo_whatsapp">WhatsApp</label>
                  <input id="novo_whatsapp" name="novo_whatsapp" className="input" inputMode="tel" placeholder="(11) 91234-5678" />
                </div>
              </div>
            )}

            {trocando && (
              <label className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
                <input type="checkbox" name="confirmar_troca" value="1" required className="mt-0.5 accent-amber-400" />
                <span>Confirmo transferir esta plaquinha de <strong>{p?.nome_empresa}</strong> para outro cliente.</span>
              </label>
            )}
          </Passo>

          <Passo n={3} titulo="Destino" ativo={Boolean(p)}>
            <CamposDestino
              key={p?.id ?? 'vazio'}
              tipoInicial={(p?.destino_tipo as DestinoTipo | null) ?? null}
              valorInicial={p?.destino_valor ?? null}
              urlInicial={p?.destino_url ?? null}
            />
          </Passo>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1"><FormMessage state={state} /></div>
          <div className="flex gap-2">
            {p && (
              <button type="button" className="btn-ghost" onClick={recomecar}>
                Recomeçar
              </button>
            )}
            <SubmitButton className="btn-accent h-10 px-5" disabled={!p}>
              Salvar e ativar
            </SubmitButton>
          </div>
        </div>
      </form>
    </div>
  );
}
