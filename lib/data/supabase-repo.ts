import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { urlPublica } from '@/lib/site';
import type { Acesso, Cliente, ClienteDados, Evento, PlaquinhaDetalhe, PlaquinhaItem, Stats, Status } from '@/lib/types';
import { ErroDeNegocio, type DestinoDados, type FiltroAcessos, type FiltroPlaquinhas, type Repo } from './repo';

interface PgError {
  code?: string;
  message: string;
}

function falha(error: PgError, contexto: string): never {
  if (error.code === '23505') throw new ErroDeNegocio('Já existe um registro com esse código.');
  if (error.code === '23514') throw new ErroDeNegocio(error.message.includes('código') ? error.message : 'Dados inválidos.');
  if (error.code === '42501') throw new ErroDeNegocio('Sem permissão. Verifique se o usuário é administrador.');
  console.error(`[supabase] ${contexto}:`, error.code, error.message);
  throw new Error(`Erro ao ${contexto}. Tente novamente.`);
}

/** Remove caracteres que alteram a sintaxe dos filtros do PostgREST. */
function termoSeguro(v: string | undefined) {
  return (v ?? '').replace(/[%,()*\\:"'.]/g, ' ').trim().slice(0, 60);
}

const SP = '-03:00'; // America/Sao_Paulo (sem horário de verão desde 2019)

type ClienteRow = Omit<Cliente, 'total_plaquinhas'> & { plaquinhas?: { count: number }[] };

function mapCliente(r: ClienteRow): Cliente {
  return {
    id: r.id,
    nome_empresa: r.nome_empresa,
    responsavel: r.responsavel,
    whatsapp: r.whatsapp,
    observacoes: r.observacoes,
    data_criacao: r.data_criacao,
    total_plaquinhas: r.plaquinhas?.[0]?.count ?? 0,
  };
}

function mapPlaquinha(r: Record<string, unknown>): PlaquinhaItem {
  return {
    ...(r as unknown as PlaquinhaItem),
    valor_venda: r.valor_venda === null || r.valor_venda === undefined ? null : Number(r.valor_venda),
    total_leituras: Number(r.total_leituras ?? 0),
  };
}

export class SupabaseRepo implements Repo {
  readonly modo = 'supabase' as const;
  private db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? createClient();
  }

  async stats(): Promise<Stats> {
    const { data, error } = await this.db.rpc('dashboard_stats');
    if (error) falha(error, 'carregar indicadores');
    const s = (Array.isArray(data) ? data[0] : data) ?? {};
    return {
      total: Number(s.total ?? 0),
      ativas: Number(s.ativas ?? 0),
      aguardando: Number(s.aguardando ?? 0),
      desativadas: Number(s.desativadas ?? 0),
      leituras: Number(s.leituras ?? 0),
    };
  }

  async contagemPorStatus(): Promise<Record<Status, number>> {
    const s = await this.stats();
    return { ativa: s.ativas, aguardando: s.aguardando, desativada: s.desativadas };
  }

  async leiturasPorDia(dias: number) {
    const { data, error } = await this.db.rpc('leituras_por_dia', { p_dias: dias });
    if (error) falha(error, 'carregar leituras');
    return ((data ?? []) as { dia: string; total: number }[]).map((d) => ({ dia: d.dia, total: Number(d.total) }));
  }

  async listarPlaquinhas(f: FiltroPlaquinhas) {
    let q = this.db
      .from('vw_plaquinhas')
      .select('*', { count: 'exact' })
      .order('data_criacao', { ascending: false })
      .order('codigo', { ascending: false })
      .range((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina - 1);
    const termo = termoSeguro(f.busca);
    if (termo) {
      q = q.or(
        `codigo.ilike.%${termo}%,codigo_publico.ilike.%${termo}%,nome_empresa.ilike.%${termo}%,responsavel.ilike.%${termo}%`,
      );
    }
    if (f.status) q = q.eq('status', f.status);
    const { data, count, error } = await q;
    if (error) falha(error, 'listar plaquinhas');
    return { itens: (data ?? []).map(mapPlaquinha), total: count ?? 0 };
  }

  private async detalhe(coluna: 'id' | 'codigo_publico' | 'codigo', valor: string): Promise<PlaquinhaDetalhe | null> {
    const { data, error } = await this.db.from('vw_plaquinhas').select('*').eq(coluna, valor).maybeSingle();
    if (error) falha(error, 'carregar plaquinha');
    if (!data) return null;
    const { data: cfg } = await this.db
      .from('configuracoes')
      .select('destino_valor')
      .eq('plaque_id', data.id)
      .maybeSingle();
    return { ...mapPlaquinha(data), destino_valor: cfg?.destino_valor ?? null };
  }

  obterPlaquinha(id: string) {
    return this.detalhe('id', id);
  }

  async buscarPorCodigo(codigo: string) {
    return (await this.detalhe('codigo_publico', codigo)) ?? (await this.detalhe('codigo', codigo));
  }

  async criarPlaquinhas(quantidade: number, siteUrl: string) {
    const { data, error } = await this.db
      .from('plaquinhas')
      .insert(Array.from({ length: quantidade }, () => ({ status: 'aguardando' })))
      .select('id, codigo_publico');
    if (error) falha(error, 'criar plaquinhas');
    await this.preencherUrls(data ?? [], siteUrl);
    return this.porIds((data ?? []).map((d) => d.id));
  }

  async importarCodigos(codigos: string[], siteUrl: string) {
    const { data: existentes, error: e1 } = await this.db
      .from('plaquinhas')
      .select('codigo_publico')
      .in('codigo_publico', codigos);
    if (e1) falha(e1, 'verificar códigos');
    const jaExistem = new Set<string>((existentes ?? []).map((e) => e.codigo_publico as string));
    const novos = codigos.filter((c) => !jaExistem.has(c));
    if (novos.length) {
      const { data, error } = await this.db
        .from('plaquinhas')
        .insert(novos.map((c) => ({ codigo_publico: c, status: 'aguardando' })))
        .select('id, codigo_publico');
      if (error) falha(error, 'importar códigos');
      await this.preencherUrls(data ?? [], siteUrl);
    }
    return { criadas: novos, existentes: Array.from(jaExistem) };
  }

  private async preencherUrls(linhas: { id: string; codigo_publico: string }[], siteUrl: string) {
    for (const l of linhas) {
      const { error } = await this.db
        .from('plaquinhas')
        .update({ url_permanente: urlPublica(siteUrl, l.codigo_publico) })
        .eq('id', l.id);
      if (error) falha(error, 'gravar URL permanente');
    }
  }

  private async porIds(ids: string[]) {
    if (!ids.length) return [];
    const { data, error } = await this.db.from('vw_plaquinhas').select('*').in('id', ids).order('codigo');
    if (error) falha(error, 'carregar plaquinhas');
    return (data ?? []).map(mapPlaquinha);
  }

  async vincularCliente(id: string, clienteId: string | null) {
    const { error } = await this.db.from('plaquinhas').update({ cliente_id: clienteId }).eq('id', id);
    if (error) falha(error, 'vincular cliente');
  }

  async salvarVenda(id: string, dados: { data_venda: string | null; valor_venda: number | null }) {
    const { error } = await this.db.from('plaquinhas').update(dados).eq('id', id);
    if (error) falha(error, 'salvar dados da venda');
  }

  async salvarDestino(id: string, d: DestinoDados) {
    const { error } = await this.db.from('configuracoes').upsert(
      {
        plaque_id: id,
        destino_tipo: d.tipo,
        destino_valor: d.valor,
        destino_url: d.url,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'plaque_id' },
    );
    if (error) falha(error, 'salvar destino');
  }

  async alterarStatus(id: string, status: Status) {
    const { error } = await this.db.from('plaquinhas').update({ status }).eq('id', id);
    if (error) falha(error, 'alterar status');
  }

  async excluirPlaquinha(id: string) {
    const { error } = await this.db.from('plaquinhas').delete().eq('id', id);
    if (error) falha(error, 'excluir plaquinha');
  }

  async listarEventos(id: string): Promise<Evento[]> {
    const { data, error } = await this.db
      .from('plaquinha_eventos')
      .select('id, tipo, descricao, criado_em')
      .eq('plaque_id', id)
      .order('criado_em', { ascending: false })
      .limit(50);
    if (error) falha(error, 'carregar histórico');
    return (data ?? []).map((e) => ({ ...e, id: String(e.id) })) as Evento[];
  }

  async ultimasLeituras(limite: number) {
    const { data, error } = await this.db
      .from('vw_acessos')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(limite);
    if (error) falha(error, 'carregar leituras');
    return (data ?? []).map((a) => ({ ...a, id: String(a.id) })) as Acesso[];
  }

  async listarClientes(busca?: string) {
    let q = this.db
      .from('clientes')
      .select('id, nome_empresa, responsavel, whatsapp, observacoes, data_criacao, plaquinhas(count)')
      .order('nome_empresa');
    const termo = termoSeguro(busca);
    if (termo) {
      q = q.or(`nome_empresa.ilike.%${termo}%,responsavel.ilike.%${termo}%,whatsapp.ilike.%${termo.replace(/\D/g, '') || termo}%`);
    }
    const { data, error } = await q.limit(500);
    if (error) falha(error, 'listar clientes');
    return ((data ?? []) as ClienteRow[]).map(mapCliente);
  }

  async obterCliente(id: string) {
    const { data, error } = await this.db
      .from('clientes')
      .select('id, nome_empresa, responsavel, whatsapp, observacoes, data_criacao, plaquinhas(count)')
      .eq('id', id)
      .maybeSingle();
    if (error) falha(error, 'carregar cliente');
    return data ? mapCliente(data as ClienteRow) : null;
  }

  async plaquinhasDoCliente(id: string) {
    const { data, error } = await this.db.from('vw_plaquinhas').select('*').eq('cliente_id', id).order('codigo');
    if (error) falha(error, 'carregar plaquinhas do cliente');
    return (data ?? []).map(mapPlaquinha);
  }

  async criarCliente(dados: ClienteDados) {
    const { data, error } = await this.db
      .from('clientes')
      .insert(dados)
      .select('id, nome_empresa, responsavel, whatsapp, observacoes, data_criacao')
      .single();
    if (error) falha(error, 'cadastrar cliente');
    return mapCliente(data as ClienteRow);
  }

  async atualizarCliente(id: string, dados: ClienteDados) {
    const { error } = await this.db.from('clientes').update(dados).eq('id', id);
    if (error) falha(error, 'atualizar cliente');
  }

  async excluirCliente(id: string) {
    const { error } = await this.db.from('clientes').delete().eq('id', id);
    if (error) falha(error, 'excluir cliente');
  }

  async clienteDuplicado(dados: ClienteDados, ignorarId?: string) {
    const nome = termoSeguro(dados.nome_empresa);
    const filtros = [`nome_empresa.ilike.${nome}`];
    if (dados.whatsapp) filtros.push(`whatsapp.eq.${dados.whatsapp.replace(/\D/g, '')}`);
    let q = this.db
      .from('clientes')
      .select('id, nome_empresa, responsavel, whatsapp, observacoes, data_criacao')
      .or(filtros.join(','))
      .limit(1);
    if (ignorarId) q = q.neq('id', ignorarId);
    const { data, error } = await q;
    if (error) falha(error, 'verificar duplicidade');
    return data?.[0] ? mapCliente(data[0] as ClienteRow) : null;
  }

  async listarAcessos(f: FiltroAcessos) {
    let q = this.db
      .from('vw_acessos')
      .select('*', { count: 'exact' })
      .order('data_hora', { ascending: false })
      .range((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina - 1);
    if (f.de) q = q.gte('data_hora', `${f.de}T00:00:00${SP}`);
    if (f.ate) q = q.lte('data_hora', `${f.ate}T23:59:59.999${SP}`);
    const termo = termoSeguro(f.codigo);
    if (termo) q = q.or(`codigo_publico.ilike.%${termo}%,codigo.ilike.%${termo}%`);
    const { data, count, error } = await q;
    if (error) falha(error, 'carregar histórico de acessos');
    return { itens: (data ?? []).map((a) => ({ ...a, id: String(a.id) })) as Acesso[], total: count ?? 0 };
  }
}

/** Consulta pública usada pela rota /r/[codigo]. Retorna apenas status e destino. */
export async function resolverRedirectSupabase(
  db: SupabaseClient,
  codigo: string,
  ipHash: string | null,
  dispositivo: string,
): Promise<{ status: Status; destino_url: string | null } | null> {
  const { data, error } = await db.rpc('resolver_redirect', {
    p_codigo: codigo,
    p_ip_hash: ipHash,
    p_dispositivo: dispositivo,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  return row ? { status: row.status as Status, destino_url: row.destino_url ?? null } : null;
}
