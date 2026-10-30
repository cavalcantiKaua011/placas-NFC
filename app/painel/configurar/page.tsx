import { paginaAdmin } from '@/lib/auth';
import { normalizarCodigo } from '@/lib/codigo';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfigurarWizard } from '@/components/painel/ConfigurarWizard';

export const metadata = { title: 'Configurar plaquinha' };
export const dynamic = 'force-dynamic';

export default async function ConfigurarPage({ searchParams }: { searchParams: { codigo?: string } }) {
  const { repo, demo } = await paginaAdmin();
  const clientes = await repo.listarClientes();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Configurar plaquinha"
        description="Localize a plaquinha, escolha o cliente e defina para onde ela leva. Ao salvar, ela fica ativa."
      />
      <ConfigurarWizard
        clientes={clientes.map((c) => ({ id: c.id, nome_empresa: c.nome_empresa }))}
        codigoInicial={normalizarCodigo(searchParams.codigo) ?? ''}
        demo={demo}
      />
    </div>
  );
}
