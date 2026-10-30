'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useFormState } from 'react-dom';
import { UserPlus } from 'lucide-react';
import { vincularCliente } from '@/app/painel/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import type { ActionState } from '@/lib/types';

export function VinculoForm({
  id,
  codigoPublico,
  clienteAtual,
  clientes,
}: {
  id: string;
  codigoPublico: string;
  clienteAtual: { id: string; nome: string } | null;
  clientes: { id: string; nome_empresa: string }[];
}) {
  const [state, action] = useFormState<ActionState, FormData>(vincularCliente, {});
  const [selecionado, setSelecionado] = useState(clienteAtual?.id ?? '');
  const trocando = Boolean(clienteAtual && selecionado !== clienteAtual.id);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor="cliente_id">Cliente vinculado</label>
        <select id="cliente_id" name="cliente_id" className="input" value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
          <option value="">— Sem cliente —</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome_empresa}</option>
          ))}
        </select>
        <p className="hint">
          Cliente novo?{' '}
          <Link href={`/painel/configurar?codigo=${codigoPublico}`} className="inline-flex items-center gap-1 text-accent hover:underline">
            <UserPlus className="h-3 w-3" aria-hidden /> Cadastre pelo fluxo de configuração
          </Link>
        </p>
      </div>

      {trocando && (
        <label className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <input type="checkbox" name="confirmar_troca" value="1" required className="mt-0.5 accent-amber-400" />
          <span>
            Confirmo que esta plaquinha deixará de pertencer a <strong>{clienteAtual?.nome}</strong>.
          </span>
        </label>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage state={state} />
        <SubmitButton className="btn-primary sm:ml-auto" disabled={selecionado === (clienteAtual?.id ?? '')}>
          Salvar vínculo
        </SubmitButton>
      </div>
    </form>
  );
}
