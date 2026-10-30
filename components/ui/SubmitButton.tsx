'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';

export function SubmitButton({
  children,
  className = 'btn-primary',
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} aria-busy={pending} className={className}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
