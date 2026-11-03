import type { Acesso, Cliente, ClienteDados, DestinoTipo, Evento, PlaquinhaDetalhe, PlaquinhaItem, Stats, Status } from '@/lib/types';

export interface FiltroPlaquinhas {
  busca?: string;
  status?: Status | '';
  pagina: number;
  porPagina: number;
}

export interface FiltroAcessos {
  de?: string; // YYYY-MM-DD (fuso São Paulo)
  ate?: string;
  codigo?: string;
  pagina: number;
  porPagina: number;
}

export interface DestinoDados {
  tipo: DestinoTipo;
  valor: string;
  url: string;
}

/** Operações de dados do painel. Implementadas pelo Supabase (real) e em memória (demonstração). */
export interface Repo {
  readonly modo: 'supabase' | 'demo';
  stats(): Promise<Stats>;
  contagemPorStatus(): Promise<Record<Status, number>>;
  leiturasPorDia(dias: number): Promise<{ dia: string; total: number }[]>;

  listarPlaquinhas(f: FiltroPlaquinhas): Promise<{ itens: PlaquinhaItem[]; total: number }>;
  obterPlaquinha(id: string): Promise<PlaquinhaDetalhe | null>;
  /** Várias plaquinhas por id (ordem: etiqueta interna). Ids inexistentes são ignorados. */
  obterPorIds(ids: string[]): Promise<PlaquinhaItem[]>;
  buscarPorCodigo(codigo: string): Promise<PlaquinhaDetalhe | null>;
  criarPlaquinhas(quantidade: number, siteUrl: string): Promise<PlaquinhaItem[]>;
  importarCodigos(codigos: string[], siteUrl: string): Promise<{ criadas: string[]; existentes: string[] }>;
  vincularCliente(id: string, clienteId: string | null): Promise<void>;
  salvarVenda(id: string, dados: { data_venda: string | null; valor_venda: number | null }): Promise<void>;
  salvarDestino(id: string, destino: DestinoDados): Promise<void>;
  alterarStatus(id: string, status: Status): Promise<void>;
  excluirPlaquinha(id: string): Promise<void>;
  listarEventos(id: string): Promise<Evento[]>;
  ultimasLeituras(limite: number): Promise<Acesso[]>;

  listarClientes(busca?: string): Promise<Cliente[]>;
  obterCliente(id: string): Promise<Cliente | null>;
  plaquinhasDoCliente(id: string): Promise<PlaquinhaItem[]>;
  criarCliente(dados: ClienteDados): Promise<Cliente>;
  atualizarCliente(id: string, dados: ClienteDados): Promise<void>;
  excluirCliente(id: string): Promise<void>;
  clienteDuplicado(dados: ClienteDados, ignorarId?: string): Promise<Cliente | null>;

  listarAcessos(f: FiltroAcessos): Promise<{ itens: Acesso[]; total: number }>;
}

/** Erro com mensagem que pode ser exibida ao usuário. */
export class ErroDeNegocio extends Error {}
