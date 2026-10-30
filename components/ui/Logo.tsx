import Link from 'next/link';

export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-lg bg-accent text-accent-ink ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="h-[62%] w-[62%]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M7 8.5a5 5 0 0 1 0 7" />
        <path d="M10.5 6a8.5 8.5 0 0 1 0 12" />
        <path d="M14 3.5a12 12 0 0 1 0 17" />
      </svg>
    </span>
  );
}

export function Logo({ className = '', href }: { className?: string; href?: string }) {
  const conteudo = (
    <>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-50">Placas NFC</span>
    </>
  );
  const cls = `flex items-center gap-2.5 ${className}`;
  return href ? (
    <Link href={href} className={cls} aria-label="Placas NFC — início">
      {conteudo}
    </Link>
  ) : (
    <div className={cls}>{conteudo}</div>
  );
}
