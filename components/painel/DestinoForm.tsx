'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { CheckCircle2, Globe, Instagram, Link2, MessageCircle, Star, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { salvarDestino } from '@/app/painel/actions';
import { DESTINOS, DESTINO_TIPOS, mensagemDoWhatsapp, previaDestino } from '@/lib/destino';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import type { ActionState, DestinoTipo } from '@/lib/types';

const ICONES: Record<DestinoTipo, React.ComponentType<{ className?: string }>> = {
  google_reviews: Star,
  instagram: Instagram,
  whatsapp: MessageCircle,
  cardapio: UtensilsCrossed,
  site: Globe,
  personalizado: Link2,
};

/** Campos de destino reutilizados no detalhe da plaquinha e no fluxo "Configurar". */
export function CamposDestino({
  tipoInicial,
  valorInicial,
  urlInicial,
}: {
  tipoInicial: DestinoTipo | null;
  valorInicial: string | null;
  urlInicial: string | null;
}) {
  const [tipo, setTipo] = useState<DestinoTipo>(tipoInicial ?? 'google_reviews');
  const [valor, setValor] = useState(tipoInicial ? valorInicial ?? '' : '');
  const [mensagem, setMensagem] = useState(tipoInicial === 'whatsapp' ? mensagemDoWhatsapp(urlInicial) : '');
  const meta = DESTINOS[tipo];
  const previa = valor.trim() ? previaDestino(tipo, valor, mensagem) : null;

  return (
    <div className="space-y-4">
      <input type="hidden" name="destino_tipo" value={tipo} />
      <fieldset>
        <legend className="label">Tipo de destino</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {DESTINO_TIPOS.map((t) => {
            const Icon = ICONES[t];
            const sel = t === tipo;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={sel}
                onClick={() => {
                  setTipo(t);
                  setValor(t === tipoInicial ? valorInicial ?? '' : '');
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border px-1 py-3 text-xs transition ${
                  sel ? 'border-accent/60 bg-accent-soft text-zinc-50' : 'border-line bg-bg text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-4 w-4 ${sel ? 'text-accent' : ''}`} aria-hidden />
                {DESTINOS[t].label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="destino_valor">{meta.label}</label>
        <input
          id="destino_valor"
          name="destino_valor"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          className="input"
          placeholder={meta.placeholder}
          inputMode={tipo === 'whatsapp' ? 'tel' : 'url'}
          autoComplete="off"
          required
          aria-describedby="destino-ajuda destino-previa"
        />
        <p id="destino-ajuda" className="hint">{meta.help}</p>
      </div>

      {tipo === 'whatsapp' && (
        <div>
          <label className="label" htmlFor="mensagem">
            Mensagem inicial <span className="font-normal text-zinc-500">(opcional)</span>
          </label>
          <input id="mensagem" name="mensagem" value={mensagem} onChange={(e) => setMensagem(e.target.value)} className="input" placeholder="Olá! Vim pela plaquinha." maxLength={500} />
        </div>
      )}

      <div id="destino-previa" aria-live="polite">
        {previa?.url && (
          <p className="flex items-start gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-xs">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <span className="min-w-0">
              <span className="text-zinc-500">Vai redirecionar para </span>
              <span className="break-all font-mono text-zinc-200">{previa.url}</span>
            </span>
          </p>
        )}
        {previa?.erro && (
          <p className="flex items-start gap-2 text-xs text-amber-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {previa.erro}
          </p>
        )}
      </div>
    </div>
  );
}

export function DestinoForm({
  id,
  tipo,
  valor,
  url,
}: {
  id: string;
  tipo: DestinoTipo | null;
  valor: string | null;
  url: string | null;
}) {
  const [state, action] = useFormState<ActionState, FormData>(salvarDestino, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <CamposDestino tipoInicial={tipo} valorInicial={valor} urlInicial={url} />
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage state={state} />
        <SubmitButton className="btn-accent sm:ml-auto">Salvar destino</SubmitButton>
      </div>
    </form>
  );
}
