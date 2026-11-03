'use client';

import Image from 'next/image';
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, Presentation } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { ARTES, ARTE_IDS, LIMITE_PLAQUINHAS, MEDIDAS, POR_SLIDE, planejar, type ArteId } from '@/lib/pptx/plano';
import { formatNumber } from '@/lib/format';

type Origem = 'selecionadas' | 'filtro';
type Modo = 'todas' | 'escolher';

export function GerarPptxDialog({
  open,
  onClose,
  selecionadas,
  totalFiltro,
  filtro,
  origemInicial,
  demo,
}: {
  open: boolean;
  onClose: () => void;
  selecionadas: string[];
  totalFiltro: number;
  filtro: { busca: string; status: string };
  origemInicial: Origem;
  demo: boolean;
}) {
  const [origem, setOrigem] = useState<Origem>(origemInicial);
  const [modo, setModo] = useState<Modo>('todas');
  const [escolhidas, setEscolhidas] = useState<ArteId[]>(['google_azul']);
  const [estado, setEstado] = useState<'pronto' | 'gerando' | 'ok' | 'erro'>('pronto');
  const [mensagem, setMensagem] = useState('');

  const qtdPlaquinhas = origem === 'selecionadas' ? selecionadas.length : totalFiltro;
  const artes = modo === 'todas' ? ARTE_IDS : ARTE_IDS.filter((a) => escolhidas.includes(a));
  const plano = planejar(qtdPlaquinhas, artes.length);
  const acimaDoLimite = qtdPlaquinhas > LIMITE_PLAQUINHAS;
  const podeGerar = qtdPlaquinhas > 0 && artes.length > 0 && !acimaDoLimite && estado !== 'gerando';

  function alternar(id: ArteId) {
    setEscolhidas((atual) => (atual.includes(id) ? atual.filter((a) => a !== id) : [...atual, id]));
  }

  async function gerar() {
    setEstado('gerando');
    setMensagem('');
    try {
      const corpo = origem === 'selecionadas' ? { ids: selecionadas, artes } : { filtro, artes };
      const res = await fetch('/painel/plaquinhas/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `Falha ao gerar (erro ${res.status}).`);
      }
      const blob = await res.blob();
      const nome = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'plaquinhas.pptx';
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
      setEstado('ok');
      setMensagem(`${nome} — ${res.headers.get('X-Slides') ?? plano.slides} slide(s), ${res.headers.get('X-Unidades') ?? plano.unidades} unidade(s).`);
    } catch (e) {
      setEstado('erro');
      setMensagem(e instanceof Error ? e.message : 'Falha ao gerar o PowerPoint.');
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => estado !== 'gerando' && onClose()}
      title="Gerar PowerPoint para impressão"
      description={`Usa as artes originais de produção: cartão de ${MEDIDAS.cartaoCm} × ${MEDIDAS.cartaoCm} cm, QR Code de ${MEDIDAS.qrCm} × ${MEDIDAS.qrCm} cm, ${POR_SLIDE} unidades por slide (${MEDIDAS.colunas} × ${MEDIDAS.linhas}).`}
      size="lg"
    >
      <div className="space-y-5">
        <fieldset>
          <legend className="label">Plaquinhas</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['selecionadas', `Selecionadas (${selecionadas.length})`, 'As que você marcou na lista'],
                ['filtro', `Todas do filtro atual (${formatNumber(totalFiltro)})`, 'Respeita a busca e o status escolhidos'],
              ] as const
            ).map(([v, titulo, desc]) => (
              <label
                key={v}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  origem === v ? 'border-accent/60 bg-accent-soft' : 'border-line bg-bg hover:border-zinc-600'
                } ${v === 'selecionadas' && !selecionadas.length ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="origem"
                  className="mt-0.5 accent-green-500"
                  checked={origem === v}
                  disabled={v === 'selecionadas' && !selecionadas.length}
                  onChange={() => setOrigem(v)}
                />
                <span>
                  <span className="block font-medium text-zinc-100">{titulo}</span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Artes</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['todas', 'Todas as artes', 'Cada plaquinha nas 6 variações (mesmo QR em todas)'],
                ['escolher', 'Escolher artes', 'Uma ou mais variações específicas'],
              ] as const
            ).map(([v, titulo, desc]) => (
              <label
                key={v}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${
                  modo === v ? 'border-accent/60 bg-accent-soft' : 'border-line bg-bg hover:border-zinc-600'
                }`}
              >
                <input type="radio" name="modo" className="mt-0.5 accent-green-500" checked={modo === v} onChange={() => setModo(v)} />
                <span>
                  <span className="block font-medium text-zinc-100">{titulo}</span>
                  <span className="block text-xs text-muted">{desc}</span>
                </span>
              </label>
            ))}
          </div>

          {modo === 'escolher' && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" role="group" aria-label="Artes">
              {ARTES.map((a) => {
                const sel = escolhidas.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={sel}
                    onClick={() => alternar(a.id)}
                    className={`group relative rounded-lg border p-1.5 text-left transition ${
                      sel ? 'border-accent bg-accent-soft' : 'border-line bg-bg opacity-70 hover:opacity-100'
                    }`}
                  >
                    <Image src={`/artes/${a.id}.png`} alt="" width={120} height={120} className="aspect-square w-full rounded" />
                    <span className="mt-1 block text-[11px] leading-tight text-zinc-300">{a.nome}</span>
                    {sel && <CheckCircle2 className="absolute right-1 top-1 h-4 w-4 rounded-full bg-bg text-accent" aria-hidden />}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <dl className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-bg p-3 text-sm sm:grid-cols-4">
          {(
            [
              ['Plaquinhas', plano.plaquinhas],
              ['Modelos', plano.artes],
              ['Unidades', plano.unidades],
              ['Slides', plano.slides],
            ] as const
          ).map(([l, v]) => (
            <div key={l}>
              <dt className="text-xs text-muted">{l}</dt>
              <dd className="text-xl font-semibold tabular-nums text-zinc-50">{formatNumber(v)}</dd>
            </div>
          ))}
        </dl>

        {acimaDoLimite && (
          <p role="alert" className="flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Máximo de {LIMITE_PLAQUINHAS} plaquinhas por arquivo. Refine o filtro ou selecione menos.
          </p>
        )}

        <p className="text-xs text-zinc-500">
          Somente leitura: o arquivo usa o código público já existente de cada plaquinha e não altera cadastros nem destinos.
          {demo && ' Modo demonstração: os QR Codes apontam para o domínio da demonstração.'}
        </p>

        {estado === 'gerando' && (
          <p role="status" className="flex items-center gap-2 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Gerando {formatNumber(plano.slides)} slide(s)…
          </p>
        )}
        {estado === 'ok' && (
          <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> Download iniciado: {mensagem}
          </p>
        )}
        {estado === 'erro' && (
          <p role="alert" className="flex items-start gap-2 text-sm text-red-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {mensagem}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={estado === 'gerando'}>
            Fechar
          </button>
          <button type="button" className="btn-accent" onClick={gerar} disabled={!podeGerar}>
            {estado === 'gerando' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            Gerar PowerPoint
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function BotaoGerarPptx({ onClick, quantidade }: { onClick: () => void; quantidade?: number }) {
  return (
    <button type="button" className="btn-secondary" onClick={onClick}>
      <Presentation className="h-4 w-4" aria-hidden />
      Gerar PowerPoint para Impressão{quantidade ? ` (${quantidade})` : ''}
    </button>
  );
}
