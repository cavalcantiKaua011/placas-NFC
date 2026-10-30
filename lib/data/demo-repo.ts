import 'server-only';
import { gerarCodigoPublico } from '@/lib/codigo';
import { STATUS_LABEL, TZ } from '@/lib/format';
import type { Acesso, Cliente, ClienteDados, DestinoTipo, Evento, PlaquinhaDetalhe, PlaquinhaItem, Stats, Status } from '@/lib/types';
import { ErroDeNegocio, type DestinoDados, type FiltroAcessos, type FiltroPlaquinhas, type Repo } from './repo';

/**
 * Repositório de DEMONSTRAÇÃO: dados fictícios em memória do servidor.
 * Não conecta ao Supabase. Os dados são reiniciados quando o servidor reinicia
 * (na Vercel isso acontece com frequência) e não são compartilhados entre instâncias.
 */

interface PlaqRow {
  id: string;
  codigo: string;
  codigo_publico: string;
  status: Status;
  cliente_id: string | null;
  data_venda: string | null;
  valor_venda: number | null;
  total_leituras: number;
  ultimo_acesso: string | null;
  data_criacao: string;
}
interface CfgRow {
  destino_tipo: DestinoTipo;
  destino_valor: string;
  destino_url: string;
}
interface AcessoRow {
  id: number;
  plaque_id: string;
  data_hora: string;
  dispositivo: string;
  ip_hash: string | null;
}
interface EventoRow extends Evento {
  plaque_id: string;
}
interface ClienteRow extends ClienteDados {
  id: string;
  data_criacao: string;
}

interface DemoDB {
  seq: number;
  idSeq: number;
  plaquinhas: PlaqRow[];
  clientes: ClienteRow[];
  config: Map<string, CfgRow>;
  acessos: AcessoRow[];
  eventos: EventoRow[];
}

const DIA = 86_400_000;

/** Gerador pseudoaleatório determinístico (dados de exemplo estáveis). */
function prng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function seed(): DemoDB {
  const rnd = prng(42);
  const agora = Date.now();
  const db: DemoDB = { seq: 0, idSeq: 1, plaquinhas: [], clientes: [], config: new Map(), acessos: [], eventos: [] };
  const uid = () => `demo-${(db.idSeq++).toString(36).padStart(4, '0')}`;

  const clientes: [string, string, string, string | null][] = [
    ['Padaria Pão Dourado (exemplo)', 'Marina Alves', '11987654321', 'Plaquinha no caixa e outra na mesa da entrada.'],
    ['Barbearia Navalha Fina (exemplo)', 'Rafael Souza', '11912345678', null],
    ['Café Grão Nobre (exemplo)', 'Juliana Prado', '21998765432', 'Prefere contato pelo WhatsApp após 14h.'],
    ['Pet Shop Patas (exemplo)', 'Carlos Lima', '31991234567', null],
    ['Restaurante Sabor da Serra (exemplo)', 'Ana Ribeiro', '41996543210', 'Cardápio atualizado toda segunda-feira.'],
  ];
  for (const [nome, resp, wpp, obs] of clientes) {
    db.clientes.push({
      id: uid(),
      nome_empresa: nome,
      responsavel: resp,
      whatsapp: `55${wpp}`,
      observacoes: obs,
      data_criacao: new Date(agora - (40 + rnd() * 30) * DIA).toISOString(),
    });
  }

  const destinos: [DestinoTipo, string, string][] = [
    ['google_reviews', 'https://g.page/r/EXEMPLO-PADARIA/review', 'https://g.page/r/EXEMPLO-PADARIA/review'],
    ['instagram', '@barbearia.exemplo', 'https://instagram.com/barbearia.exemplo'],
    ['google_reviews', 'https://g.page/r/EXEMPLO-CAFE/review', 'https://g.page/r/EXEMPLO-CAFE/review'],
    ['whatsapp', '(31) 99123-4567', 'https://wa.me/5531991234567'],
    ['cardapio', 'https://cardapio.exemplo.com.br/sabor-da-serra', 'https://cardapio.exemplo.com.br/sabor-da-serra'],
  ];

  // 14 plaquinhas: 8 ativas, 4 aguardando, 2 desativadas
  const plano: { status: Status; cliente?: number }[] = [
    { status: 'ativa', cliente: 0 }, { status: 'ativa', cliente: 0 }, { status: 'ativa', cliente: 1 },
    { status: 'ativa', cliente: 2 }, { status: 'ativa', cliente: 2 }, { status: 'ativa', cliente: 3 },
    { status: 'ativa', cliente: 4 }, { status: 'ativa', cliente: 4 }, { status: 'desativada', cliente: 1 },
    { status: 'desativada', cliente: 3 }, { status: 'aguardando' }, { status: 'aguardando' },
    { status: 'aguardando' }, { status: 'aguardando' },
  ];
  plano.forEach((p, i) => {
    db.seq++;
    const criada = new Date(agora - (35 - i) * DIA).toISOString();
    const cliente = p.cliente !== undefined ? db.clientes[p.cliente] : null;
    const row: PlaqRow = {
      id: uid(),
      codigo: `NFC-${String(db.seq).padStart(4, '0')}`,
      codigo_publico: ['DEMO2K7M', 'DEMO8QXP', 'DEMO4HWT', 'DEMO9RZB', 'DEMO3NVA', 'DEMO6JCE', 'DEMO5TYU', 'DEMO7GPF', 'DEMO2MKD', 'DEMO8SHX', 'DEMO4BQE', 'DEMO9WNC', 'DEMO3FRV', 'DEMO6XAT'][i],
      status: p.status,
      cliente_id: cliente?.id ?? null,
      data_venda: cliente ? new Date(agora - (30 - i) * DIA).toISOString().slice(0, 10) : null,
      valor_venda: cliente ? [149.9, 129.9, 99.9][i % 3] : null,
      total_leituras: 0,
      ultimo_acesso: null,
      data_criacao: criada,
    };
    db.plaquinhas.push(row);
    db.eventos.push({ id: String(db.idSeq++), plaque_id: row.id, tipo: 'criada', descricao: 'Plaquinha criada', criado_em: criada });
    if (p.cliente !== undefined) {
      const [tipo, valor, url] = destinos[p.cliente];
      db.config.set(row.id, { destino_tipo: tipo, destino_valor: valor, destino_url: url });
      const quando = new Date(agora - (29 - i) * DIA).toISOString();
      db.eventos.push(
        { id: String(db.idSeq++), plaque_id: row.id, tipo: 'cliente', descricao: `Vinculada ao cliente ${cliente!.nome_empresa}`, criado_em: quando },
        { id: String(db.idSeq++), plaque_id: row.id, tipo: 'destino', descricao: `Destino definido: ${url}`, criado_em: quando },
        { id: String(db.idSeq++), plaque_id: row.id, tipo: 'status', descricao: 'Status: Aguardando configuração → Ativa', criado_em: quando },
      );
      if (p.status === 'desativada') {
        db.eventos.push({ id: String(db.idSeq++), plaque_id: row.id, tipo: 'status', descricao: 'Status: Ativa → Desativada', criado_em: new Date(agora - 6 * DIA).toISOString() });
      }
    }
  });

  // Leituras fictícias nos últimos 30 dias
  const disp = ['ios', 'android', 'android', 'ios', 'desktop', 'outro'];
  let acessoId = 1;
  for (const p of db.plaquinhas.filter((x) => x.cliente_id)) {
    const peso = 0.5 + rnd() * 2.5;
    for (let d = 29; d >= 0; d--) {
      if (p.status === 'desativada' && d < 6) continue;
      const n = Math.floor(rnd() * peso * 1.6);
      for (let k = 0; k < n; k++) {
        const t = agora - d * DIA - rnd() * 10 * 3600_000;
        db.acessos.push({ id: acessoId++, plaque_id: p.id, data_hora: new Date(t).toISOString(), dispositivo: disp[Math.floor(rnd() * disp.length)], ip_hash: null });
      }
    }
  }
  db.acessos.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  for (const a of db.acessos) {
    const p = db.plaquinhas.find((x) => x.id === a.plaque_id)!;
    p.total_leituras++;
    p.ultimo_acesso = a.data_hora;
  }
  return db;
}

const g = globalThis as unknown as { __placasDemoDB?: DemoDB };
function store(): DemoDB {
  if (!g.__placasDemoDB) g.__placasDemoDB = seed();
  return g.__placasDemoDB;
}

/** Reinicia os dados fictícios (botão "Restaurar dados de exemplo"). */
export function reiniciarDemo() {
  g.__placasDemoDB = seed();
}

function contem(alvo: string | null | undefined, termo: string) {
  return (alvo ?? '').toLowerCase().includes(termo.toLowerCase());
}

function diaSP(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso));
}

export class DemoRepo implements Repo {
  readonly modo = 'demo' as const;

  private db = store();

  private item(p: PlaqRow): PlaquinhaItem {
    const c = p.cliente_id ? this.db.clientes.find((x) => x.id === p.cliente_id) : undefined;
    const cfg = this.db.config.get(p.id);
    return {
      ...p,
      nome_empresa: c?.nome_empresa ?? null,
      responsavel: c?.responsavel ?? null,
      whatsapp: c?.whatsapp ?? null,
      destino_tipo: cfg?.destino_tipo ?? null,
      destino_url: cfg?.destino_url ?? null,
    };
  }

  private detalhe(p: PlaqRow): PlaquinhaDetalhe {
    return { ...this.item(p), destino_valor: this.db.config.get(p.id)?.destino_valor ?? null };
  }

  private cliente(c: ClienteRow): Cliente {
    return { ...c, total_plaquinhas: this.db.plaquinhas.filter((p) => p.cliente_id === c.id).length };
  }

  private acesso(a: AcessoRow): Acesso {
    const p = this.db.plaquinhas.find((x) => x.id === a.plaque_id)!;
    const c = p.cliente_id ? this.db.clientes.find((x) => x.id === p.cliente_id) : undefined;
    return { id: String(a.id), data_hora: a.data_hora, dispositivo: a.dispositivo, plaque_id: p.id, codigo: p.codigo, codigo_publico: p.codigo_publico, nome_empresa: c?.nome_empresa ?? null };
  }

  private evento(plaqueId: string, tipo: Evento['tipo'], descricao: string) {
    this.db.eventos.push({ id: String(this.db.idSeq++), plaque_id: plaqueId, tipo, descricao, criado_em: new Date().toISOString() });
  }

  private exigir(id: string) {
    const p = this.db.plaquinhas.find((x) => x.id === id);
    if (!p) throw new ErroDeNegocio('Plaquinha não encontrada.');
    return p;
  }

  async stats(): Promise<Stats> {
    const ps = this.db.plaquinhas;
    return {
      total: ps.length,
      ativas: ps.filter((p) => p.status === 'ativa').length,
      aguardando: ps.filter((p) => p.status === 'aguardando').length,
      desativadas: ps.filter((p) => p.status === 'desativada').length,
      leituras: ps.reduce((a, p) => a + p.total_leituras, 0),
    };
  }

  async contagemPorStatus() {
    const s = await this.stats();
    return { ativa: s.ativas, aguardando: s.aguardando, desativada: s.desativadas };
  }

  async leiturasPorDia(dias: number) {
    const hoje = Date.now();
    const out: { dia: string; total: number }[] = [];
    for (let i = dias - 1; i >= 0; i--) out.push({ dia: diaSP(new Date(hoje - i * DIA).toISOString()), total: 0 });
    const idx = new Map(out.map((o, i) => [o.dia, i]));
    for (const a of this.db.acessos) {
      const i = idx.get(diaSP(a.data_hora));
      if (i !== undefined) out[i].total++;
    }
    return out;
  }

  async listarPlaquinhas(f: FiltroPlaquinhas) {
    let lista = [...this.db.plaquinhas].reverse().map((p) => this.item(p));
    const termo = f.busca?.trim();
    if (termo) {
      lista = lista.filter((p) => contem(p.codigo, termo) || contem(p.codigo_publico, termo) || contem(p.nome_empresa, termo) || contem(p.responsavel, termo));
    }
    if (f.status) lista = lista.filter((p) => p.status === f.status);
    return { itens: lista.slice((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina), total: lista.length };
  }

  async obterPlaquinha(id: string) {
    const p = this.db.plaquinhas.find((x) => x.id === id);
    return p ? this.detalhe(p) : null;
  }

  async buscarPorCodigo(codigo: string) {
    const c = codigo.toUpperCase();
    const p = this.db.plaquinhas.find((x) => x.codigo_publico === c || x.codigo === c);
    return p ? this.detalhe(p) : null;
  }

  private nova(codigoPublico?: string): PlaqRow {
    this.db.seq++;
    const p: PlaqRow = {
      id: `demo-${(this.db.idSeq++).toString(36).padStart(4, '0')}`,
      codigo: `NFC-${String(this.db.seq).padStart(4, '0')}`,
      codigo_publico: codigoPublico ?? gerarCodigoPublico(),
      status: 'aguardando',
      cliente_id: null,
      data_venda: null,
      valor_venda: null,
      total_leituras: 0,
      ultimo_acesso: null,
      data_criacao: new Date().toISOString(),
    };
    this.db.plaquinhas.push(p);
    this.evento(p.id, 'criada', 'Plaquinha criada');
    return p;
  }

  async criarPlaquinhas(quantidade: number) {
    return Array.from({ length: quantidade }, () => this.item(this.nova()));
  }

  async importarCodigos(codigos: string[]) {
    const existentes = codigos.filter((c) => this.db.plaquinhas.some((p) => p.codigo_publico === c));
    const criadas = codigos.filter((c) => !existentes.includes(c));
    criadas.forEach((c) => this.nova(c));
    return { criadas, existentes };
  }

  async vincularCliente(id: string, clienteId: string | null) {
    const p = this.exigir(id);
    if (p.cliente_id === clienteId) return;
    p.cliente_id = clienteId;
    const c = clienteId ? this.db.clientes.find((x) => x.id === clienteId) : null;
    this.evento(id, 'cliente', c ? `Vinculada ao cliente ${c.nome_empresa}` : 'Cliente desvinculado');
  }

  async salvarVenda(id: string, dados: { data_venda: string | null; valor_venda: number | null }) {
    const p = this.exigir(id);
    if (p.data_venda === dados.data_venda && p.valor_venda === dados.valor_venda) return;
    Object.assign(p, dados);
    this.evento(id, 'venda', 'Dados da venda atualizados');
  }

  async salvarDestino(id: string, d: DestinoDados) {
    this.exigir(id);
    const anterior = this.db.config.get(id);
    this.db.config.set(id, { destino_tipo: d.tipo, destino_valor: d.valor, destino_url: d.url });
    if (anterior?.destino_url !== d.url) this.evento(id, 'destino', `Destino definido: ${d.url}`);
  }

  async alterarStatus(id: string, status: Status) {
    const p = this.exigir(id);
    if (p.status === status) return;
    this.evento(id, 'status', `Status: ${STATUS_LABEL[p.status]} → ${STATUS_LABEL[status]}`);
    p.status = status;
  }

  async excluirPlaquinha(id: string) {
    this.exigir(id);
    this.db.plaquinhas = this.db.plaquinhas.filter((p) => p.id !== id);
    this.db.config.delete(id);
    this.db.acessos = this.db.acessos.filter((a) => a.plaque_id !== id);
    this.db.eventos = this.db.eventos.filter((e) => e.plaque_id !== id);
  }

  async listarEventos(id: string) {
    return this.db.eventos
      .filter((e) => e.plaque_id === id)
      .sort((a, b) => b.criado_em.localeCompare(a.criado_em) || Number(b.id) - Number(a.id))
      .map(({ plaque_id: _p, ...e }) => e);
  }

  async ultimasLeituras(limite: number) {
    return this.db.acessos.slice(-limite).reverse().map((a) => this.acesso(a));
  }

  async listarClientes(busca?: string) {
    const termo = busca?.trim() ?? '';
    return this.db.clientes
      .filter((c) => !termo || contem(c.nome_empresa, termo) || contem(c.responsavel, termo) || contem(c.whatsapp, termo.replace(/\D/g, '') || termo))
      .sort((a, b) => a.nome_empresa.localeCompare(b.nome_empresa, 'pt-BR'))
      .map((c) => this.cliente(c));
  }

  async obterCliente(id: string) {
    const c = this.db.clientes.find((x) => x.id === id);
    return c ? this.cliente(c) : null;
  }

  async plaquinhasDoCliente(id: string) {
    return this.db.plaquinhas.filter((p) => p.cliente_id === id).map((p) => this.item(p));
  }

  async criarCliente(dados: ClienteDados) {
    const c: ClienteRow = { ...dados, id: `demo-${(this.db.idSeq++).toString(36).padStart(4, '0')}`, data_criacao: new Date().toISOString() };
    this.db.clientes.push(c);
    return this.cliente(c);
  }

  async atualizarCliente(id: string, dados: ClienteDados) {
    const c = this.db.clientes.find((x) => x.id === id);
    if (!c) throw new ErroDeNegocio('Cliente não encontrado.');
    Object.assign(c, dados);
  }

  async excluirCliente(id: string) {
    for (const p of this.db.plaquinhas.filter((x) => x.cliente_id === id)) await this.vincularCliente(p.id, null);
    this.db.clientes = this.db.clientes.filter((c) => c.id !== id);
  }

  async clienteDuplicado(dados: ClienteDados, ignorarId?: string) {
    const nome = dados.nome_empresa.trim().toLowerCase();
    const wpp = dados.whatsapp?.replace(/\D/g, '');
    const c = this.db.clientes.find((x) => x.id !== ignorarId && (x.nome_empresa.trim().toLowerCase() === nome || (wpp && x.whatsapp === wpp)));
    return c ? this.cliente(c) : null;
  }

  async listarAcessos(f: FiltroAcessos) {
    const termo = f.codigo?.trim().toUpperCase();
    const lista = this.db.acessos
      .filter((a) => {
        const dia = diaSP(a.data_hora);
        if (f.de && dia < f.de) return false;
        if (f.ate && dia > f.ate) return false;
        if (termo) {
          const p = this.db.plaquinhas.find((x) => x.id === a.plaque_id)!;
          if (!p.codigo_publico.includes(termo) && !p.codigo.includes(termo)) return false;
        }
        return true;
      })
      .reverse();
    return { itens: lista.slice((f.pagina - 1) * f.porPagina, f.pagina * f.porPagina).map((a) => this.acesso(a)), total: lista.length };
  }
}

/** Equivalente em memória de public.resolver_redirect(). */
export function resolverRedirectDemo(codigo: string, ipHash: string | null, dispositivo: string) {
  const db = store();
  const p = db.plaquinhas.find((x) => x.codigo_publico === codigo);
  if (!p) return null;
  const cfg = db.config.get(p.id);
  const url = p.status === 'ativa' && cfg?.destino_url.startsWith('https://') ? cfg.destino_url : null;
  if (url) {
    const limite = Date.now() - 30_000;
    const repetida = ipHash && db.acessos.some((a) => a.plaque_id === p.id && a.ip_hash === ipHash && Date.parse(a.data_hora) > limite);
    if (!repetida) {
      const agora = new Date().toISOString();
      db.acessos.push({ id: (db.acessos[db.acessos.length - 1]?.id ?? 0) + 1, plaque_id: p.id, data_hora: agora, dispositivo, ip_hash: ipHash });
      p.total_leituras++;
      p.ultimo_acesso = agora;
    }
  }
  return { status: p.status, destino_url: url };
}
