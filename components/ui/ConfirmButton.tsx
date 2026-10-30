'use client';

import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog } from './Dialog';
import type { ActionState } from '@/lib/types';

/** Botão que pede confirmação antes de executar uma ação (ex.: excluir, desativar). */
export function ConfirmButton({
  children,
  className = 'btn-secondary',
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
  action,
  onDone,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  action: () => Promise<ActionState | void>;
  onDone?: (r: ActionState) => void;
}) {
  const [open, setOpen] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <button type="button" className={className} onClick={() => { setErro(null); setOpen(true); }}>
        {children}
      </button>
      <Dialog open={open} onClose={() => !pending && setOpen(false)} title={title} description={description} size="sm">
        {erro && <p role="alert" className="mb-4 text-sm text-red-300">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger-solid' : 'btn-primary'}
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await action();
                if (r?.error) {
                  setErro(r.error);
                  return;
                }
                setOpen(false);
                if (r) onDone?.(r);
              })
            }
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </button>
        </div>
      </Dialog>
    </>
  );
}
