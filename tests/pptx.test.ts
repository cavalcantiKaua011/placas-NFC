import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { MODELO } from '@/lib/pptx/modelo.generated';
import { ARTES, ARTE_IDS, ErroGeracao, gerarPptx, layoutDaArte, planejar, posicoesDaGrade } from '@/lib/pptx/gerar';

const CM = 360_000;
// PNG 1×1 branco: o conteúdo do QR não importa para estes testes de layout
const PNG = Uint8Array.from(
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP4DwABAQEAG2ue9AAAAABJRU5ErkJggg==', 'base64'),
);
const qrFalso = async () => PNG;

const itens = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const codigo = `TESTE${String(i + 1).padStart(3, '0')}`;
    return { codigo, url: `https://exemplo.com.br/r/${codigo}` };
  });

async function abrir(bytes: Uint8Array) {
  const zip = await JSZip.loadAsync(bytes);
  const nomes = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const slides = await Promise.all(nomes.map((n) => zip.file(n)!.async('string')));
  return { zip, slides };
}

describe('modelo extraído do PowerPoint de produção', () => {
  it('tem as 6 artes, na mesma ordem e com os mesmos nomes do plano', () => {
    expect(MODELO.artes.map((a) => a.id)).toEqual(ARTE_IDS);
    expect(MODELO.artes.map((a) => a.nome)).toEqual(ARTES.map((a) => a.nome));
  });
  it('mantém o tamanho de slide do modelo (50,8 × 28,575 cm)', () => {
    expect(MODELO.slide).toEqual({ cx: 18288000, cy: 10287000 });
  });
});

describe('planejar', () => {
  it.each([
    [8, 6, 6, 48],
    [16, 1, 2, 16],
    [10, 6, 12, 60],
    [1, 2, 2, 2],
    [0, 6, 0, 0],
  ])('%i plaquinhas × %i artes → %i slides, %i unidades', (p, a, slides, unidades) => {
    const r = planejar(p, a);
    expect(r.slides).toBe(slides);
    expect(r.unidades).toBe(unidades);
  });
});

describe('layout físico', () => {
  it('grade 4 × 2 de cartões 12 × 12 cm dentro do slide', () => {
    const g = posicoesDaGrade();
    expect(g).toHaveLength(8);
    for (const r of g) {
      expect(r.w).toBe(12 * CM);
      expect(r.h).toBe(12 * CM);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(MODELO.slide.cx);
      expect(r.y + r.h).toBeLessThanOrEqual(MODELO.slide.cy);
    }
  });
  it('QR 3 × 3 cm centralizado na área reservada de cada arte', () => {
    const alvo = posicoesDaGrade()[0];
    for (const arte of MODELO.artes) {
      const L = layoutDaArte(arte, alvo);
      expect(L.qr.w).toBe(3 * CM);
      expect(L.qr.h).toBe(3 * CM);
      const g = arte.grupo;
      const cx = L.off.x + (arte.areaQr.x + arte.areaQr.w / 2 - g.chOffX) * L.escala;
      const cy = L.off.y + (arte.areaQr.y + arte.areaQr.h / 2 - g.chOffY) * L.escala;
      expect(Math.abs(L.qr.x + L.qr.w / 2 - cx)).toBeLessThanOrEqual(1);
      expect(Math.abs(L.qr.y + L.qr.h / 2 - cy)).toBeLessThanOrEqual(1);
      // cartão escalado = 12 cm
      expect(Math.round(arte.cartao.w * L.escala)).toBe(12 * CM);
    }
  });
});

describe('gerarPptx', () => {
  it('Modo A: 8 plaquinhas → 6 slides × 8, mesmo QR nas 6 artes', async () => {
    const { slides, zip } = await abrir(await gerarPptx({ itens: itens(8), artes: ARTE_IDS, qrPng: qrFalso }));
    expect(slides).toHaveLength(6);
    slides.forEach((xml, i) => {
      expect(xml.match(/name="Plaquinha /g)).toHaveLength(8);
      expect(xml).toContain(`— ${ARTES[i].nome}"`);
      const urls = Array.from(xml.matchAll(/name="QR [^"]+" descr="([^"]+)"/g)).map((m) => m[1]);
      expect(urls).toEqual(itens(8).map((it) => it.url));
      const ids = Array.from(xml.matchAll(/<p:cNvPr id="(\d+)"/g)).map((m) => m[1]);
      expect(new Set(ids).size).toBe(ids.length);
      expect(xml.match(/<a:ext cx="1080000" cy="1080000"\/>/g)).toHaveLength(8);
    });
    // 1 PNG de QR por plaquinha, reaproveitado nas 6 artes
    expect(Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/qr_'))).toHaveLength(8);
    const pres = await zip.file('ppt/presentation.xml')!.async('string');
    expect(pres.match(/<p:sldId /g)).toHaveLength(6);
  });

  it('paginação: 10 plaquinhas em 1 arte → 2 slides (8 + 2), sem slide vazio', async () => {
    const { slides } = await abrir(await gerarPptx({ itens: itens(10), artes: ['google_azul'], qrPng: qrFalso }));
    expect(slides.map((x) => x.match(/name="Plaquinha /g)!.length)).toEqual([8, 2]);
  });

  it('Modo B: várias artes saem agrupadas por modelo, na ordem padrão', async () => {
    const { slides } = await abrir(
      await gerarPptx({ itens: itens(3), artes: ['whatsapp_preto', 'google_preto'], qrPng: qrFalso }),
    );
    expect(slides).toHaveLength(2);
    expect(slides[0]).toContain('— Google preto"');
    expect(slides[1]).toContain('— WhatsApp preto"');
  });

  it('recusa entradas inválidas', async () => {
    await expect(gerarPptx({ itens: [], artes: ARTE_IDS, qrPng: qrFalso })).rejects.toThrow(ErroGeracao);
    await expect(gerarPptx({ itens: itens(2), artes: [], qrPng: qrFalso })).rejects.toThrow(ErroGeracao);
    const dup = [...itens(1), ...itens(1)];
    await expect(gerarPptx({ itens: dup, artes: ARTE_IDS, qrPng: qrFalso })).rejects.toThrow(/repetido/);
    await expect(
      gerarPptx({ itens: [{ codigo: 'ABCD1234', url: 'https://x.com/r/OUTRO' }], artes: ARTE_IDS, qrPng: qrFalso }),
    ).rejects.toThrow(/não corresponde/);
  });
});
