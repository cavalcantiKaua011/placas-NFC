import type { Status } from '@/lib/types';
import { STATUS_LABEL } from '@/lib/format';

const STYLES: Record<Status, string> = {
  ativa: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  aguardando: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  desativada: 'border-zinc-600/50 bg-zinc-700/20 text-zinc-400',
};

const DOT: Record<Status, string> = {
  ativa: 'bg-emerald-400',
  aguardando: 'bg-amber-400',
  desativada: 'bg-zinc-500',
};

export function StatusBadge({ status, short = false }: { status: Status; short?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status]}`} aria-hidden />
      {short && status === 'aguardando' ? 'Aguardando' : STATUS_LABEL[status]}
    </span>
  );
}
