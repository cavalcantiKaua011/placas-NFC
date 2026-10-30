'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { History, LayoutGrid, LogOut, Menu, Nfc, Settings, Users, Wand2, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { sair } from '@/app/painel/actions';

const ITENS = [
  { href: '/painel', label: 'Visão geral', icon: LayoutGrid, exato: true },
  { href: '/painel/plaquinhas', label: 'Minhas Plaquinhas', icon: Nfc },
  { href: '/painel/clientes', label: 'Clientes', icon: Users },
  { href: '/painel/acessos', label: 'Histórico de acessos', icon: History },
  { href: '/painel/configuracoes', label: 'Configurações', icon: Settings },
];

function Navegacao({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Navegação do painel" className="flex flex-col gap-0.5">
      <Link
        href="/painel/configurar"
        onClick={onNavigate}
        className="btn-accent mb-4 h-10 w-full justify-start px-3"
        aria-current={path.startsWith('/painel/configurar') ? 'page' : undefined}
      >
        <Wand2 className="h-4 w-4" aria-hidden /> Configurar plaquinha
      </Link>
      {ITENS.map(({ href, label, icon: Icon, exato }) => {
        const ativo = exato ? path === href : path === href || path.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={ativo ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              ativo ? 'bg-accent-soft font-medium text-accent' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Conta({ email }: { email: string }) {
  return (
    <div className="border-t border-line pt-3">
      <p className="truncate px-3 pb-2 text-xs text-zinc-500" title={email}>
        {email}
      </p>
      <form action={sair}>
        <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition hover:bg-zinc-800/60 hover:text-zinc-100">
          <LogOut className="h-4 w-4" aria-hidden /> Sair da conta
        </button>
      </form>
    </div>
  );
}

export function Sidebar({ email }: { email: string }) {
  const [aberto, setAberto] = useState(false);
  const path = usePathname();

  useEffect(() => setAberto(false), [path]);
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-bg px-3 py-5 lg:flex">
        <Logo href="/painel" className="mb-7 px-2" />
        <Navegacao />
        <div className="mt-auto">
          <Conta email={email} />
        </div>
      </aside>

      {/* Celular / tablet */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Logo href="/painel" />
        <button
          type="button"
          className="btn-ghost h-9 w-9 px-0"
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          aria-expanded={aberto}
          aria-controls="menu-movel"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-black/70" onClick={() => setAberto(false)} />
          <div id="menu-movel" className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col border-r border-line bg-bg px-3 py-4">
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo />
              <button type="button" className="btn-ghost h-9 w-9 px-0" onClick={() => setAberto(false)} aria-label="Fechar menu" autoFocus>
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <Navegacao onNavigate={() => setAberto(false)} />
            <div className="mt-auto">
              <Conta email={email} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
