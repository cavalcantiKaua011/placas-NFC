import Link from 'next/link';

export function Pagination({
  pagina,
  total,
  porPagina,
  href,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  href: (p: number) => string;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm text-muted" aria-label="Paginação">
      <span>
        Página {pagina} de {paginas}
      </span>
      <div className="flex gap-2">
        {pagina > 1 && (
          <Link href={href(pagina - 1)} className="btn-secondary">
            Anterior
          </Link>
        )}
        {pagina < paginas && (
          <Link href={href(pagina + 1)} className="btn-secondary">
            Próxima
          </Link>
        )}
      </div>
    </nav>
  );
}
