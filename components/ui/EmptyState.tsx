import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full border border-line bg-elevated">
        <Icon className="h-5 w-5 text-zinc-400" aria-hidden />
      </div>
      <p className="mt-4 text-sm font-medium text-zinc-200">{title}</p>
      <div className="mt-1 max-w-sm text-sm text-muted">{description}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
