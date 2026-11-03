import { describe, expect, it } from 'vitest';
import { qrPng } from '@/lib/pptx/qr-png';

function dimensoesPng(b: Uint8Array) {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

describe('qrPng', () => {
  it('gera PNG quadrado com resolução para impressão (≥ 1000 px em 3 cm)', async () => {
    const png = await qrPng('https://placas-nfc.vercel.app/r/K7M2QX9P');
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const { w, h } = dimensoesPng(png);
    expect(w).toBe(h);
    expect(w).toBeGreaterThanOrEqual(1000);
  });
});
