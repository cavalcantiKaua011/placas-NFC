'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
      setCarregando(false);
      return;
    }
    router.replace('/painel');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="senha">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" required className="input" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      {erro && (
        <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {erro}
        </p>
      )}
      <button type="submit" disabled={carregando} className="btn-accent h-10 w-full">
        {carregando && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Entrar
      </button>
    </form>
  );
}
