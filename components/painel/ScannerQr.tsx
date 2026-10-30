'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

interface DetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

/** Lê o QR Code pela câmera quando o navegador suporta BarcodeDetector (Chrome/Android). */
export function ScannerQr({ onLeitura }: { onLeitura: (texto: string) => void }) {
  const [suportado, setSuportado] = useState(false);
  const [ativo, setAtivo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setSuportado(typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    if (!ativo) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelado = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (cancelado || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
        const detector = new Detector({ formats: ['qr_code'] });
        timer = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codigos = await detector.detect(videoRef.current);
            if (codigos[0]?.rawValue) {
              onLeitura(codigos[0].rawValue);
              setAtivo(false);
            }
          } catch {
            /* quadro ainda não pronto */
          }
        }, 350);
      } catch {
        setErro('Não foi possível acessar a câmera. Verifique a permissão do navegador.');
        setAtivo(false);
      }
    })();

    return () => {
      cancelado = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [ativo, onLeitura]);

  if (!suportado) return null;

  return (
    <div>
      {ativo ? (
        <div className="relative overflow-hidden rounded-lg border border-line bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover sm:aspect-video" muted playsInline aria-label="Câmera para leitura do QR Code" />
          <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-accent/80" aria-hidden />
          <button type="button" onClick={() => setAtivo(false)} className="btn-secondary absolute right-2 top-2 h-8 px-2">
            <X className="h-4 w-4" aria-hidden /> Fechar
          </button>
        </div>
      ) : (
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => { setErro(null); setAtivo(true); }}>
          <Camera className="h-4 w-4" aria-hidden /> Escanear QR com a câmera
        </button>
      )}
      {erro && <p role="alert" className="mt-2 text-sm text-red-300">{erro}</p>}
    </div>
  );
}
