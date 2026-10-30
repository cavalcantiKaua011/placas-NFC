'use client';

import { useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { alterarSenha, restaurarDemo } from '@/app/painel/actions';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import type { ActionState } from '@/lib/types';

export function AlterarSenhaForm() {
  const [state, action] = useFormState<ActionState, FormData>(alterarSenha, {});
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="senha">Nova senha</label>
          <input id="senha" name="senha" type="password" autoComplete="new-password" minLength={10} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="confirmar">Confirmar senha</label>
          <input id="confirmar" name="confirmar" type="password" autoComplete="new-password" minLength={10} required className="input" />
        </div>
      </div>
      <p className="hint">Mínimo de 10 caracteres.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage state={state} />
        <SubmitButton className="btn-primary sm:ml-auto">Alterar senha</SubmitButton>
      </div>
    </form>
  );
}

export function RestaurarDemo() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>({});
  return (
    <div className="space-y-2">
      <button type="button" className="btn-secondary" disabled={pending} onClick={() => start(async () => setMsg(await restaurarDemo()))}>
        <RotateCcw className="h-4 w-4" aria-hidden /> Restaurar dados de exemplo
      </button>
      <FormMessage state={msg} />
    </div>
  );
}
