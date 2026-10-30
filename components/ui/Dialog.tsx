'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/** Modal acessível baseado em <dialog> (foco preso, Esc fecha). */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const largura = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`w-[calc(100%-2rem)] ${largura} rounded-xl border border-line bg-panel p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm`}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="relative p-6">
          <button type="button" onClick={onClose} className="btn-ghost absolute right-3 top-3 h-8 w-8 px-0" aria-label="Fechar">
            <X className="h-4 w-4" aria-hidden />
          </button>
          <h2 id="dialog-title" className="pr-8 text-base font-semibold">
            {title}
          </h2>
          {description && <div className="mt-1 text-sm text-muted">{description}</div>}
          <div className="mt-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}
