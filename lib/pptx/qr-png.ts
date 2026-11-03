import QRCode from 'qrcode';

/**
 * QR Code em PNG para impressão: módulos pretos puros sobre branco, sem suavização.
 * - ~1200 px de lado → acima de 1000 dpi em 3 cm (impressão nítida).
 * - Margem branca (zona de silêncio) de 2 módulos dentro dos 3 × 3 cm; a área reservada
 *   da arte é branca e soma mais ~3 módulos de folga ao redor.
 * - Correção de erro "M" (15%): bom equilíbrio entre tamanho do módulo e tolerância a riscos.
 */
export const QR_MARGEM_MODULOS = 2;
const LADO_ALVO_PX = 1200;

export async function qrPng(url: string): Promise<Uint8Array> {
  const modulos = QRCode.create(url, { errorCorrectionLevel: 'M' }).modules.size;
  const escala = Math.max(8, Math.ceil(LADO_ALVO_PX / (modulos + 2 * QR_MARGEM_MODULOS)));
  const buf = await QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'M',
    margin: QR_MARGEM_MODULOS,
    scale: escala,
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  return new Uint8Array(buf);
}
