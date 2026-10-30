'use client';

import { useFormState } from 'react-dom';
import { salvarVenda } from '@/app/painel/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import type { ActionState } from '@/lib/types';

export function VendaForm({ id, dataVenda, valorVenda }: { id: string; dataVenda: string | null; valorVenda: number | null }) {
  const [state, action] = useFormState<ActionState, FormData>(salvarVenda, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="data_venda">Data da venda</label>
          <input id="data_venda" name="data_venda" type="date" defaultValue={dataVenda ?? ''} className="input [color-scheme:dark]" />
        </div>
        <div>
          <label className="label" htmlFor="valor_venda">Valor (R$)</label>
          <input
            id="valor_venda"
            name="valor_venda"
            inputMode="decimal"
            defaultValue={valorVenda !== null ? valorVenda.toFixed(2).replace('.', ',') : ''}
            className="input tabular-nums"
            placeholder="149,90"
          />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage state={state} />
        <SubmitButton className="btn-primary sm:ml-auto">Salvar venda</SubmitButton>
      </div>
    </form>
  );
}
