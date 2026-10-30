'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom';
import { Trash2, UserPlus } from 'lucide-react';
import { atualizarCliente, criarCliente, excluirCliente } from '@/app/painel/actions';
import { Dialog } from '@/components/ui/Dialog';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { formatPhone } from '@/lib/format';
import type { ActionState, Cliente } from '@/lib/types';

function Campos({ c }: { c?: Partial<Cliente> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="nome_empresa">Nome do estabelecimento</label>
        <input id="nome_empresa" name="nome_empresa" defaultValue={c?.nome_empresa ?? ''} className="input" required minLength={2} maxLength={120} />
      </div>
      <div>
        <label className="label" htmlFor="responsavel">Contato</label>
        <input id="responsavel" name="responsavel" defaultValue={c?.responsavel ?? ''} className="input" maxLength={120} placeholder="Nome do responsável" />
      </div>
      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp</label>
        <input id="whatsapp" name="whatsapp" defaultValue={c?.whatsapp ? formatPhone(c.whatsapp) : ''} className="input" inputMode="tel" placeholder="(11) 91234-5678" />
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="observacoes">Observações operacionais</label>
        <textarea id="observacoes" name="observacoes" defaultValue={c?.observacoes ?? ''} className="input" rows={3} maxLength={1000} placeholder="Ex.: plaquinha no caixa; prefere contato à tarde" />
      </div>
    </div>
  );
}

export function NovoClienteDialog({ abrirInicial = false }: { abrirInicial?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(abrirInicial);
  const [state, action] = useFormState<ActionState & { id?: string }, FormData>(criarCliente, {});

  useEffect(() => {
    if (state.ok && state.id) router.push(`/painel/clientes/${state.id}`);
  }, [state, router]);

  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" aria-hidden /> Novo cliente
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Novo cliente" size="lg">
        <form action={action} className="space-y-4">
          <Campos />
          <FormMessage state={state} />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancelar</button>
            <SubmitButton className="btn-primary">Cadastrar</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}

export function EditarClienteForm({ cliente }: { cliente: Cliente }) {
  const [state, action] = useFormState<ActionState, FormData>(atualizarCliente, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={cliente.id} />
      <Campos c={cliente} />
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <FormMessage state={state} />
        <SubmitButton className="btn-primary sm:ml-auto">Salvar alterações</SubmitButton>
      </div>
    </form>
  );
}

export function ExcluirCliente({ id, nome, plaquinhas }: { id: string; nome: string; plaquinhas: number }) {
  return (
    <ConfirmButton
      className="btn-danger"
      danger
      title={`Excluir ${nome}?`}
      description={
        plaquinhas > 0
          ? `As ${plaquinhas} plaquinha(s) vinculada(s) continuarão existindo, sem cliente, e mantêm o destino atual. Esta ação não pode ser desfeita.`
          : 'Esta ação não pode ser desfeita.'
      }
      confirmLabel="Excluir cliente"
      action={() => excluirCliente(id)}
    >
      <Trash2 className="h-4 w-4" aria-hidden /> Excluir cliente
    </ConfirmButton>
  );
}
