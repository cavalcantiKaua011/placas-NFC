import { Logo } from '@/components/ui/Logo';

const MENSAGENS: Record<string, { titulo: string; texto: string }> = {
  aguardando: {
    titulo: 'Plaquinha ainda não ativada',
    texto: 'Esta plaquinha existe, mas ainda não foi configurada pelo estabelecimento. Tente novamente mais tarde.',
  },
  desativada: {
    titulo: 'Plaquinha desativada',
    texto: 'Esta plaquinha não está ativa no momento. Fale com o estabelecimento.',
  },
  'nao-encontrada': {
    titulo: 'Plaquinha não encontrada',
    texto: 'Não encontramos nenhuma plaquinha com este código.',
  },
  erro: {
    titulo: 'Não foi possível abrir agora',
    texto: 'Tivemos um problema temporário. Tente novamente em alguns instantes.',
  },
};

export const metadata = { title: 'Plaquinha indisponível', robots: { index: false } };

export default function Indisponivel({ searchParams }: { searchParams: { motivo?: string } }) {
  const msg = MENSAGENS[searchParams.motivo ?? ''] ?? MENSAGENS['nao-encontrada'];
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <Logo className="mb-10 justify-center opacity-80" />
        <h1 className="text-xl font-semibold tracking-tight">{msg.titulo}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{msg.texto}</p>
      </div>
    </main>
  );
}
