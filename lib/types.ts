export type Status = 'aguardando' | 'ativa' | 'desativada';
export const STATUS_LIST: Status[] = ['aguardando', 'ativa', 'desativada'];

export type DestinoTipo = 'google_reviews' | 'instagram' | 'whatsapp' | 'cardapio' | 'site' | 'personalizado';

export interface PlaquinhaItem {
  id: string;
  codigo: string; // etiqueta interna (NFC-0001)
  codigo_publico: string; // usado no QR/NFC (/r/CODIGO)
  status: Status;
  data_venda: string | null;
  valor_venda: number | null;
  total_leituras: number;
  ultimo_acesso: string | null;
  data_criacao: string;
  cliente_id: string | null;
  nome_empresa: string | null;
  responsavel: string | null;
  whatsapp: string | null;
  destino_tipo: DestinoTipo | null;
  destino_url: string | null;
}

export interface PlaquinhaDetalhe extends PlaquinhaItem {
  destino_valor: string | null;
}

export interface Cliente {
  id: string;
  nome_empresa: string;
  responsavel: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  data_criacao: string;
  total_plaquinhas: number;
}

export interface ClienteDados {
  nome_empresa: string;
  responsavel: string | null;
  whatsapp: string | null;
  observacoes: string | null;
}

export interface Acesso {
  id: string;
  data_hora: string;
  dispositivo: string | null;
  plaque_id: string;
  codigo: string;
  codigo_publico: string;
  nome_empresa: string | null;
}

export interface Evento {
  id: string;
  tipo: 'criada' | 'cliente' | 'destino' | 'status' | 'venda';
  descricao: string;
  criado_em: string;
}

export interface Stats {
  total: number;
  ativas: number;
  aguardando: number;
  desativadas: number;
  leituras: number;
}

export interface ActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}
