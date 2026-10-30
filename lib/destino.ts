/** Regras dos destinos. Sem dependências de servidor: usado no navegador (prévia) e no servidor (validação final). */
import type { DestinoTipo } from './types';

export interface DestinoMeta {
  label: string;
  placeholder: string;
  help: string;
}

export const DESTINOS: Record<DestinoTipo, DestinoMeta> = {
  google_reviews: {
    label: 'Google',
    placeholder: 'https://g.page/r/XXXXXXXX/review  ou  Place ID (ChIJ...)',
    help: 'No Perfil da Empresa no Google, use "Pedir avaliações" e copie o link. Também aceita o Place ID.',
  },
  instagram: {
    label: 'Instagram',
    placeholder: '@suaempresa',
    help: 'Usuário (com ou sem @) ou link completo do perfil.',
  },
  whatsapp: {
    label: 'WhatsApp',
    placeholder: '(11) 91234-5678',
    help: 'Número com DDD. O código do país 55 é adicionado automaticamente.',
  },
  cardapio: {
    label: 'Cardápio',
    placeholder: 'https://cardapio.suaempresa.com.br',
    help: 'Link HTTPS do cardápio digital.',
  },
  site: {
    label: 'Site',
    placeholder: 'www.suaempresa.com.br',
    help: 'Endereço do site. "https://" é adicionado se faltar.',
  },
  personalizado: {
    label: 'Outro link',
    placeholder: 'https://...',
    help: 'Qualquer endereço HTTPS: catálogo, formulário, agenda etc.',
  },
};

export const DESTINO_TIPOS = Object.keys(DESTINOS) as DestinoTipo[];

export function isDestinoTipo(v: unknown): v is DestinoTipo {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(DESTINOS, v);
}

export class DestinoInvalido extends Error {}

const MAX_URL = 2048;

/** Garante uma URL HTTPS válida. Rejeita http:, javascript:, data:, credenciais e hosts locais. */
export function validarHttps(input: string): string {
  const v = input.trim();
  if (!v) throw new DestinoInvalido('Informe o endereço.');
  if (/\s/.test(v)) throw new DestinoInvalido('O endereço não pode conter espaços.');

  const temEsquema = /^[a-z][a-z0-9+.-]*:/i.test(v);
  if (temEsquema && !/^https:\/\//i.test(v)) {
    throw new DestinoInvalido('Use um endereço que comece com https://');
  }

  let url: URL;
  try {
    url = new URL(temEsquema ? v : `https://${v}`);
  } catch {
    throw new DestinoInvalido('Endereço inválido.');
  }
  if (url.protocol !== 'https:') throw new DestinoInvalido('Use um endereço que comece com https://');
  if (url.username || url.password) throw new DestinoInvalido('O endereço não pode conter usuário ou senha.');
  const host = url.hostname.toLowerCase();
  if (!host.includes('.') || host.endsWith('.local') || /^[\d.]+$/.test(host) || host.startsWith('[')) {
    throw new DestinoInvalido('Use um domínio público (ex.: www.exemplo.com.br).');
  }
  const final = url.toString();
  if (final.length > MAX_URL) throw new DestinoInvalido('Endereço muito longo.');
  return final;
}

export function apenasDigitos(v: string) {
  return v.replace(/\D/g, '');
}

/** Converte o que o administrador digitou na URL final de redirecionamento. */
export function montarDestinoUrl(tipo: DestinoTipo, valor: string, mensagem?: string): string {
  const v = valor.trim();
  if (!v) throw new DestinoInvalido('Informe o destino.');

  switch (tipo) {
    case 'google_reviews': {
      if (/^ChIJ[\w-]{10,}$/.test(v)) {
        return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(v)}`;
      }
      return validarHttps(v);
    }
    case 'whatsapp': {
      if (/^[a-z]+:\/\//i.test(v)) return validarHttps(v);
      let d = apenasDigitos(v);
      if (d.length === 10 || d.length === 11) d = `55${d}`;
      if (d.length < 12 || d.length > 15) throw new DestinoInvalido('Número de WhatsApp inválido. Use DDD + número.');
      const texto = mensagem?.trim() ? `?text=${encodeURIComponent(mensagem.trim().slice(0, 500))}` : '';
      return `https://wa.me/${d}${texto}`;
    }
    case 'instagram': {
      if (/instagram\.com/i.test(v)) return validarHttps(v);
      const usuario = v.replace(/^@/, '').trim();
      if (!/^[A-Za-z0-9._]{1,30}$/.test(usuario)) throw new DestinoInvalido('Usuário do Instagram inválido.');
      return `https://instagram.com/${usuario}`;
    }
    case 'cardapio':
    case 'site':
    case 'personalizado':
      return validarHttps(v);
  }
}

/** Tenta montar a URL sem lançar erro (para prévia na interface). */
export function previaDestino(tipo: DestinoTipo, valor: string, mensagem?: string) {
  try {
    return { url: montarDestinoUrl(tipo, valor, mensagem), erro: null as string | null };
  } catch (e) {
    return { url: null, erro: e instanceof Error ? e.message : 'Destino inválido.' };
  }
}

export function mensagemDoWhatsapp(url: string | null | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('text') ?? '';
  } catch {
    return '';
  }
}
