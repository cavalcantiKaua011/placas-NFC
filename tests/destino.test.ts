import { describe, expect, it } from 'vitest';
import { DestinoInvalido, montarDestinoUrl, validarHttps } from '@/lib/destino';

describe('validarHttps', () => {
  it('aceita https e completa o esquema quando falta', () => {
    expect(validarHttps('https://exemplo.com.br/x')).toBe('https://exemplo.com.br/x');
    expect(validarHttps('www.exemplo.com.br')).toBe('https://www.exemplo.com.br/');
  });

  it.each([
    'http://exemplo.com',
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html,oi',
    'ftp://exemplo.com',
    'https://user:senha@exemplo.com',
    'https://localhost/x',
    'https://192.168.0.1/',
    'https://exemplo .com',
    '',
  ])('rejeita %s', (v) => {
    expect(() => validarHttps(v)).toThrow(DestinoInvalido);
  });
});

describe('montarDestinoUrl', () => {
  it('WhatsApp: adiciona 55 e mensagem', () => {
    expect(montarDestinoUrl('whatsapp', '(11) 91234-5678', 'Olá!')).toBe('https://wa.me/5511912345678?text=Ol%C3%A1!');
  });
  it('WhatsApp: rejeita número curto', () => {
    expect(() => montarDestinoUrl('whatsapp', '1234')).toThrow(DestinoInvalido);
  });
  it('Instagram: @usuario vira link', () => {
    expect(montarDestinoUrl('instagram', '@minha.loja')).toBe('https://instagram.com/minha.loja');
  });
  it('Instagram: rejeita usuário inválido', () => {
    expect(() => montarDestinoUrl('instagram', 'nome com espaço')).toThrow(DestinoInvalido);
  });
  it('Google: Place ID vira link de avaliação', () => {
    expect(montarDestinoUrl('google_reviews', 'ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4',
    );
  });
  it('Cardápio exige https', () => {
    expect(() => montarDestinoUrl('cardapio', 'http://menu.com')).toThrow(DestinoInvalido);
  });
});
