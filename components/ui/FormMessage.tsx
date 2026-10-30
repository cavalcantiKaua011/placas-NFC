import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ActionState } from '@/lib/types';

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="flex items-start gap-2 text-sm text-red-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {state.message}
      </p>
    );
  }
  return null;
}
