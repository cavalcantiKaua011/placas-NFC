/**
 * Constantes e cálculo do plano de produção. Sem dependências pesadas:
 * pode ser usado no navegador (prévia na tela) e no servidor.
 */

export const ARTES = [
  { id: 'google_azul', nome: 'Google azul' },
  { id: 'google_preto', nome: 'Google preto' },
  { id: 'instagram_colorido', nome: 'Instagram colorido' },
  { id: 'instagram_preto', nome: 'Instagram preto' },
  { id: 'whatsapp_verde', nome: 'WhatsApp verde' },
  { id: 'whatsapp_preto', nome: 'WhatsApp preto' },
] as const;

export type ArteId = (typeof ARTES)[number]['id'];
export const ARTE_IDS: ArteId[] = ARTES.map((a) => a.id);

export function isArteId(v: unknown): v is ArteId {
  return typeof v === 'string' && (ARTE_IDS as string[]).includes(v);
}

/** Medidas físicas de produção (cm). */
export const MEDIDAS = {
  cartaoCm: 12,
  qrCm: 3,
  colunas: 4,
  linhas: 2,
  espacoHorizontalCm: 0.5,
  espacoVerticalCm: 1.0, // espaço para a sombra decorativa da arte
} as const;

export const POR_SLIDE = MEDIDAS.colunas * MEDIDAS.linhas;
export const LIMITE_PLAQUINHAS = 400;

export interface PlanoProducao {
  plaquinhas: number;
  artes: number;
  unidades: number;
  slidesPorArte: number;
  slides: number;
}

export function planejar(qtdPlaquinhas: number, qtdArtes: number): PlanoProducao {
  const slidesPorArte = qtdPlaquinhas > 0 ? Math.ceil(qtdPlaquinhas / POR_SLIDE) : 0;
  return {
    plaquinhas: qtdPlaquinhas,
    artes: qtdArtes,
    unidades: qtdPlaquinhas * qtdArtes,
    slidesPorArte,
    slides: slidesPorArte * qtdArtes,
  };
}
