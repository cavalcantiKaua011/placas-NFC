import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div>
        <p className="font-mono text-sm text-accent">404</p>
        <h1 className="mt-2 text-xl font-semibold">Página não encontrada</h1>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn-secondary">
            Início
          </Link>
          <Link href="/painel" className="btn-primary">
            Painel
          </Link>
        </div>
      </div>
    </main>
  );
}
