'use client';

import { useEffect, useRef, useState } from 'react';
import type QrScannerLib from 'qr-scanner';
import { GritButton, GritIcon, cx, gritFocusRing } from '@/components/ui';

type QrScannerProps = {
  /** Called with the decoded text of every read; the caller de-duplicates. */
  onDetect: (codigo: string) => void;
  /** Called when the camera cannot be used (permission denied, no camera, insecure context). */
  onError: () => void;
};

/**
 * Rear-camera QR reader for the check-in screen (US-0131). The camera is off until the user
 * presses "Habilitar lectura de QR con cámara", so the page never asks for the permission on its
 * own. `qr-scanner` decodes in a Web Worker and is imported only when the camera is turned on;
 * load this component with `next/dynamic({ ssr: false })`. The stream stops on unmount and while
 * the tab is hidden.
 */
export default function QrScanner({ onDetect, onError }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [encendida, setEncendida] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [fallo, setFallo] = useState(false);

  // Latest callbacks without restarting the camera when the parent re-renders
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onDetectRef.current = onDetect;
    onErrorRef.current = onError;
  }, [onDetect, onError]);

  useEffect(() => {
    if (!encendida) return;
    const video = videoRef.current;
    if (!video) return;

    let scanner: QrScannerLib | null = null;
    let cancelled = false;

    const fallar = () => {
      if (cancelled) return;
      setFallo(true);
      setIniciando(false);
      setEncendida(false);
      onErrorRef.current();
    };

    const onVisibility = () => {
      if (!scanner) return;
      if (document.hidden) scanner.stop();
      else void scanner.start().catch(fallar);
    };

    const iniciar = async () => {
      setIniciando(true);
      setFallo(false);
      try {
        const { default: QrScanner } = await import('qr-scanner');
        if (cancelled) return;
        if (!(await QrScanner.hasCamera())) {
          fallar();
          return;
        }
        scanner = new QrScanner(video, (result) => onDetectRef.current(result.data), {
          preferredCamera: 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          returnDetailedScanResult: true,
        });
        await scanner.start();
        if (cancelled) {
          scanner.destroy();
          return;
        }
        setIniciando(false);
        document.addEventListener('visibilitychange', onVisibility);
      } catch {
        fallar();
      }
    };

    void iniciar();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      scanner?.destroy();
    };
  }, [encendida]);

  return (
    <div className="flex flex-col gap-3">
      <div
        role="region"
        aria-label="Lector de código QR"
        className={cx(
          'relative w-full overflow-hidden rounded-grit-2xl border border-grit-glass-border bg-black',
          // Full viewfinder only while the camera is on; a compact panel otherwise
          encendida ? 'aspect-square sm:aspect-video' : 'min-h-40',
        )}
      >
        <video ref={videoRef} className={cx('h-full w-full object-cover', !encendida && 'hidden')} muted playsInline />
        {(!encendida || iniciando) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center font-grit-body text-sm text-grit-subtext">
            <GritIcon name={encendida ? 'hourglass_top' : fallo ? 'videocam_off' : 'qr_code_scanner'} size={32} />
            {encendida ? (
              'Iniciando cámara…'
            ) : (
              <>
                {fallo && <p role="alert">No se pudo acceder a la cámara. Ingresa el código manualmente.</p>}
                <GritButton size="sm" icon="videocam" onClick={() => setEncendida(true)}>
                  Habilitar lectura de QR con cámara
                </GritButton>
              </>
            )}
          </div>
        )}
      </div>
      {encendida && (
        <button
          type="button"
          onClick={() => setEncendida(false)}
          className={cx(
            'inline-flex w-fit items-center gap-1.5 self-center rounded-grit-md border border-grit-glass-border px-4 py-2 font-grit-body text-xs font-semibold text-grit-subtext transition hover:border-grit-cyan/60 hover:text-grit-cyan',
            gritFocusRing,
          )}
        >
          <GritIcon name="videocam_off" size={15} />
          Desactivar cámara
        </button>
      )}
    </div>
  );
}
