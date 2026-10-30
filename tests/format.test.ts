import { describe, expect, it } from 'vitest';
import { formatPhone, parseBRL } from '@/lib/format';

describe('parseBRL', () => {
  it.each([
    ['149,90', 149.9],
    ['1.234,56', 1234.56],
    ['R$ 99', 99],
    ['150.5', 150.5],
  ])('%s → %s', (entrada, esperado) => expect(parseBRL(entrada)).toBe(esperado));
  it.each(['abc', '-10', '1,2,3', '10,999'])('rejeita %s', (v) => expect(parseBRL(v)).toBeNull());
});

describe('formatPhone', () => {
  it('formata celular com 55', () => expect(formatPhone('5511912345678')).toBe('(11) 91234-5678'));
});
