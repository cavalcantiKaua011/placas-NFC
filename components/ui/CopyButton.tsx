'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      className={label ? 'btn-secondary' : 'btn-ghost h-8 w-8 px-0'}
      aria-label={label ? undefined : 'Copiar'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 1500);
        } catch {
          /* área de transferência indisponível */
        }
      }}
    >
      {copiado ? <Check className="h-4 w-4 text-emerald-400" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {label && (copiado ? 'Copiado' : label)}
      <span className="sr-only" aria-live="polite">{copiado ? 'Copiado' : ''}</span>
    </button>
  );
}
