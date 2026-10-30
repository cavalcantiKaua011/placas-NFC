import 'server-only';
import QRCode from 'qrcode';

/** SVG do QR Code gerado no servidor (nada é armazenado: sempre reflete o domínio atual). */
export async function qrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#ffffff' } });
}
