import { describe, expect, it } from 'vitest';
import { analisarListaCodigos, dispositivoDoUserAgent, gerarCodigoPublico, normalizarCodigo } from '@/lib/codigo';

describe('normalizarCodigo', () => {
  it('normaliza maiúsculas e espaços', () => {
    expect(normalizarCodigo(' k7m2 qx9p ')).toBe('K7M2QX9P');
  });
  it('extrai o código de uma URL lida do QR', () => {
    expect(normalizarCodigo('https://meudominio.com/r/k7m2qx9p?utm=1')).toBe('K7M2QX9P');
  });
  it('rejeita lixo e tentativas de injeção', () => {
    expect(normalizarCodigo("x'; drop table plaquinhas;--")).toBeNull();
    expect(normalizarCodigo('abc')).toBeNull();
    expect(normalizarCodigo('')).toBeNull();
  });
});

describe('gerarCodigoPublico', () => {
  it('gera 8 caracteres do alfabeto sem ambiguidades, sem repetir', () => {
    const set = new Set(Array.from({ length: 2000 }, () => gerarCodigoPublico()));
    expect(set.size).toBe(2000);
    for (const c of set) expect(c).toMatch(/^[2-9A-HJKMNP-Z]{8}$/);
  });
});

describe('analisarListaCodigos', () => {
  it('separa válidos (sem duplicados) e inválidos', () => {
    const r = analisarListaCodigos('ABCD1234\nabcd1234, XY\n  EFGH5678 ');
    expect(r.validos).toEqual(['ABCD1234', 'EFGH5678']);
    expect(r.invalidos).toEqual(['XY']);
  });
});

describe('dispositivoDoUserAgent', () => {
  it('classifica sem guardar o user-agent', () => {
    expect(dispositivoDoUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('ios');
    expect(dispositivoDoUserAgent('Mozilla/5.0 (Linux; Android 14)')).toBe('android');
    expect(dispositivoDoUserAgent('Mozilla/5.0 (Windows NT 10.0)')).toBe('desktop');
    expect(dispositivoDoUserAgent(null)).toBe('outro');
  });
});
