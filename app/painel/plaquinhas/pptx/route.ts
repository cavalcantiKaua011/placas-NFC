import { NextResponse, type NextRequest } from 'next/server';
import { obterSessao } from '@/lib/auth';
import { getSiteUrl, siteUrlConfigurada, urlPublica } from '@/lib/site';
import { STATUS_LIST, type PlaquinhaItem, type Status } from '@/lib/types';
import { ErroGeracao, gerarPptx, isArteId, LIMITE_PLAQUINHAS, planejar, type ArteId } from '@/lib/pptx/gerar';
import { qrPng } from '@/lib/pptx/qr-png';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Pedido {
  ids?: unknown;
  filtro?: { busca?: unknown; status?: unknown };
  artes?: unknown;
}

const erro = (status: number, mensagem: string) => NextResponse.json({ error: mensagem }, { status });

/**
 * Gera o PowerPoint de produção. Somente leitura: não cria códigos, não altera
 * plaquinhas nem destinos. Restrito ao administrador (mesma verificação do painel).
 */
export async function POST(request: NextRequest) {
  // Mesma origem (defesa extra além do cookie SameSite)
  const origem = request.headers.get('origin');
  if (origem && new URL(origem).host !== request.headers.get('host')) return erro(403, 'Origem não permitida.');

  const sessao = await obterSessao();
  if (sessao.estado !== 'admin') return erro(401, 'Sessão expirada ou sem permissão. Entre novamente.');
  const { repo, demo } = sessao;

  if (!demo && !siteUrlConfigurada()) {
    return erro(
      400,
      'Defina NEXT_PUBLIC_SITE_URL com o domínio definitivo antes de gerar arquivos para impressão (o domínio vai dentro do QR Code).',
    );
  }

  let pedido: Pedido;
  try {
    pedido = await request.json();
  } catch {
    return erro(400, 'Pedido inválido.');
  }

  const artes = Array.isArray(pedido.artes) ? pedido.artes.filter(isArteId) : [];
  if (!artes.length) return erro(400, 'Selecione pelo menos uma arte.');

  // Plaquinhas: por ids selecionados ou por todas do filtro atual
  let plaquinhas: PlaquinhaItem[];
  try {
    if (Array.isArray(pedido.ids)) {
      const ids = pedido.ids.filter((v): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v));
      if (!ids.length) return erro(400, 'Selecione pelo menos uma plaquinha.');
      if (ids.length > LIMITE_PLAQUINHAS) return erro(400, `Máximo de ${LIMITE_PLAQUINHAS} plaquinhas por arquivo.`);
      plaquinhas = await repo.obterPorIds(ids);
      if (plaquinhas.length !== new Set(ids).size) return erro(400, 'Algumas plaquinhas selecionadas não existem mais. Atualize a página.');
    } else if (pedido.filtro) {
      const busca = typeof pedido.filtro.busca === 'string' ? pedido.filtro.busca.slice(0, 60) : '';
      const st = pedido.filtro.status;
      const status = typeof st === 'string' && (STATUS_LIST as string[]).includes(st) ? (st as Status) : '';
      const { itens, total } = await repo.listarPlaquinhas({ busca, status, pagina: 1, porPagina: LIMITE_PLAQUINHAS });
      if (total > LIMITE_PLAQUINHAS) return erro(400, `O filtro tem ${total} plaquinhas. Máximo de ${LIMITE_PLAQUINHAS} por arquivo.`);
      plaquinhas = itens.sort((a, b) => a.codigo.localeCompare(b.codigo, 'pt-BR', { numeric: true }));
    } else {
      return erro(400, 'Selecione as plaquinhas.');
    }
  } catch (e) {
    console.error('[pptx] consulta', e);
    return erro(500, 'Não foi possível carregar as plaquinhas.');
  }
  if (!plaquinhas.length) return erro(400, 'Nenhuma plaquinha encontrada.');

  // QR = URL permanente do código PÚBLICO já existente (nada é criado ou alterado)
  const base = getSiteUrl();
  const itens = plaquinhas.map((p) => ({ codigo: p.codigo_publico, url: urlPublica(base, p.codigo_publico) }));

  try {
    const bytes = await gerarPptx({
      itens,
      artes: artes as ArteId[],
      qrPng,
      titulo: `Plaquinhas para impressão — ${itens.length} código(s)`,
    });
    const plano = planejar(itens.length, artes.length);
    const carimbo = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
      .format(new Date())
      .replace(/[^0-9]/g, '')
      .slice(0, 12);
    const nome = `plaquinhas-${carimbo}${demo ? '-DEMONSTRACAO' : ''}.pptx`;
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${nome}"`,
        'Cache-Control': 'no-store',
        'X-Plaquinhas': String(plano.plaquinhas),
        'X-Slides': String(plano.slides),
        'X-Unidades': String(plano.unidades),
      },
    });
  } catch (e) {
    if (e instanceof ErroGeracao) return erro(400, e.message);
    console.error('[pptx] geração', e);
    return erro(500, 'Falha ao gerar o PowerPoint.');
  }
}
