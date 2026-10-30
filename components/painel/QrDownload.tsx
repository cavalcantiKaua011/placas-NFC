'use client';

import QRCode from 'qrcode';
import { Download } from 'lucide-react';

function baixar(href: string, nome: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** PNG 1200px com o código impresso embaixo (para gráfica / impressão). */
export async function baixarQrPng(url: string, codigo: string) {
  const size = 1200;
  const rodape = 150;
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, url, { width: size, margin: 3, errorCorrectionLevel: 'M' });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size + rodape;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(qr, 0, 0, size, size);
  ctx.fillStyle = '#111111';
  ctx.font = '600 72px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(codigo, size / 2, size + rodape / 2 - 30);
  baixar(canvas.toDataURL('image/png'), `qrcode-${codigo}.png`);
}

export async function baixarQrSvg(url: string, codigo: string) {
  const svg = await QRCode.toString(url, { type: 'svg', margin: 3, errorCorrectionLevel: 'M' });
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const href = URL.createObjectURL(blob);
  baixar(href, `qrcode-${codigo}.svg`);
  setTimeout(() => URL.revokeObjectURL(href), 2000);
}

export function QrDownload({ url, codigo, compact = false }: { url: string; codigo: string; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" onClick={() => baixarQrPng(url, codigo)} className="btn-ghost h-8 w-8 px-0" aria-label={`Baixar QR Code ${codigo} em PNG`} title="Baixar QR Code (PNG)">
        <Download className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={() => baixarQrPng(url, codigo)} className="btn-secondary">
        <Download className="h-4 w-4" aria-hidden /> PNG
      </button>
      <button type="button" onClick={() => baixarQrSvg(url, codigo)} className="btn-secondary" title="Vetorial, ideal para gráfica">
        <Download className="h-4 w-4" aria-hidden /> SVG
      </button>
    </div>
  );
}
