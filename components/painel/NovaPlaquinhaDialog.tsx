'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import { Plus } from 'lucide-react';
import { criarPlaquinhas, importarCodigos } from '@/app/painel/actions';
import { Dialog } from '@/components/ui/Dialog';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { FormMessage } from '@/components/ui/FormMessage';
import type { ActionState } from '@/lib/types';

export function NovaPlaquinhaDialog({ label = 'Nova plaquinha' }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [aba, setAba] = useState<'gerar' | 'importar'>('gerar');
  const [gerarState, gerar] = useFormState<ActionState, FormData>(criarPlaquinhas, {});
  const [importarState, importar] = useFormState<ActionState, FormData>(importarCodigos, {});
  const importRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (importarState.ok) importRef.current?.reset();
  }, [importarState]);

  return (
    <>
      <button type="button" className="btn-accent" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cadastrar plaquinhas"
        description="Cada plaquinha recebe um código público aleatório, usado no QR Code e no chip NFC. O destino é configurado depois, na venda."
      >
        <div role="tablist" className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-bg p-0.5 text-sm">
          {(['gerar', 'importar'] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={aba === a}
              onClick={() => setAba(a)}
              className={`rounded-md py-1.5 transition ${aba === a ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {a === 'gerar' ? 'Gerar novas' : 'Importar códigos'}
            </button>
          ))}
        </div>

        {aba === 'gerar' ? (
          <form action={gerar} className="space-y-4">
            <div>
              <label className="label" htmlFor="quantidade">Quantidade</label>
              <input id="quantidade" name="quantidade" type="number" min={1} max={100} defaultValue={1} required className="input" />
              <p className="hint">De 1 a 100. Os códigos são gerados automaticamente.</p>
            </div>
            <FormMessage state={gerarState} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Fechar</button>
              <SubmitButton className="btn-primary">Gerar</SubmitButton>
            </div>
          </form>
        ) : (
          <form ref={importRef} action={importar} className="space-y-4">
            <div>
              <label className="label" htmlFor="codigos">Códigos</label>
              <textarea id="codigos" name="codigos" rows={6} required className="input font-mono" placeholder={'K7M2QX9P\nH4WT8RZB\n...'} />
              <p className="hint">
                Um por linha (ou separados por vírgula). Use quando os chips/QR já vierem com um código definido. Aceita 4 a 32
                letras, números ou hífen. Códigos repetidos são ignorados.
              </p>
            </div>
            <FormMessage state={importarState} />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Fechar</button>
              <SubmitButton className="btn-primary">Importar</SubmitButton>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
