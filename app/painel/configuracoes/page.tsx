import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { paginaAdmin } from '@/lib/auth';
import { ipHashSalt } from '@/lib/env';
import { getSiteUrl, siteUrlConfigurada, urlPublica } from '@/lib/site';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { AlterarSenhaForm, RestaurarDemo } from '@/components/painel/ContaForms';

export const metadata = { title: 'Configurações' };
export const dynamic = 'force-dynamic';

function Linha({ ok, titulo, children }: { ok: boolean; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 py-3">
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-label="OK" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-label="Atenção" />}
      <div className="min-w-0 text-sm">
        <p className="font-medium text-zinc-200">{titulo}</p>
        <div className="mt-0.5 text-muted">{children}</div>
      </div>
    </li>
  );
}

export default async function ConfiguracoesPage() {
  const { email, demo, repo } = await paginaAdmin();
  const base = getSiteUrl();
  const dominioOk = siteUrlConfigurada();
  let conexao = true;
  try {
    await repo.stats();
  } catch {
    conexao = false;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações" description="Ambiente, domínio público e conta do administrador." />
      <div className="space-y-6">
        <Card title="Ambiente">
          <ul className="-my-3 divide-y divide-line">
            <Linha ok={!demo} titulo={demo ? 'Modo demonstração' : 'Modo produção'}>
              {demo
                ? 'Dados fictícios em memória. Nenhuma operação acessa o Supabase. Os dados voltam ao exemplo quando o servidor reinicia.'
                : 'Conectado ao Supabase com autenticação e políticas de acesso (RLS) ativas.'}
            </Linha>
            {!demo && (
              <Linha ok={conexao} titulo="Banco de dados">
                {conexao ? 'Consulta de teste ao Supabase concluída.' : 'Não foi possível consultar o Supabase. Verifique as variáveis e se as migrações foram aplicadas.'}
              </Linha>
            )}
            <Linha ok={dominioOk} titulo="Domínio público dos QR Codes">
              <span className="break-all font-mono text-zinc-300">{urlPublica(base, 'CODIGO')}</span>
              {!dominioOk && (
                <span className="mt-1 block">
                  <code>NEXT_PUBLIC_SITE_URL</code> não definido: usando o endereço atual. Defina o domínio definitivo antes de imprimir.
                </span>
              )}
            </Linha>
            <Linha ok={Boolean(ipHashSalt())} titulo="Contagem de leituras repetidas">
              {ipHashSalt()
                ? 'Ativa: leituras do mesmo aparelho em 30 s contam uma vez (o IP não é salvo, apenas um hash diário).'
                : <>Defina <code>IP_HASH_SALT</code> para não contar a mesma leitura várias vezes seguidas.</>}
            </Linha>
          </ul>
        </Card>

        <Card title="Conta" description={email}>
          {demo ? (
            <div className="space-y-3 text-sm text-muted">
              <p>Na demonstração não há conta real. Você pode restaurar os dados de exemplo a qualquer momento.</p>
              <RestaurarDemo />
            </div>
          ) : (
            <AlterarSenhaForm />
          )}
        </Card>

        <Card title="Como funciona o QR Code e o NFC">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted">
            <li>O QR Code e o chip apontam para <span className="font-mono text-zinc-300">/r/CODIGO</span> neste domínio. Esse link nunca muda.</li>
            <li>O destino (Google, Instagram, WhatsApp…) fica salvo no sistema e pode ser trocado a qualquer momento, sem reimprimir.</li>
            <li>Isso só vale para plaquinhas cujo QR/NFC aponte para este domínio. Códigos que apontam para o site de outro fornecedor não podem ser controlados por aqui.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
