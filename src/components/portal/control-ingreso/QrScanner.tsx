'use client';

import { useEffect, useRef, useState } from 'react';
import type QrScannerLib from 'qr-scanner';
import { GritButton, GritCard, GritIcon, cx } from '@/components/ui';

type EstadoCamara = 'inactiva' | 'iniciando' | 'activa';

const ESTADO_LABEL: Record<EstadoCamara, string> = {
  inactiva: 'Cámara inactiva',
  iniciando: 'Iniciando cámara…',
  activa: 'Cámara activa',
};

/** The four L-shaped corners of the 170px viewfinder. */
const CORNERS = [
  'left-0 top-0 rounded-tl-[6px] border-l-[3px] border-t-[3px]',
  'right-0 top-0 rounded-tr-[6px] border-r-[3px] border-t-[3px]',
  'bottom-0 left-0 rounded-bl-[6px] border-b-[3px] border-l-[3px]',
  'bottom-0 right-0 rounded-br-[6px] border-b-[3px] border-r-[3px]',
];

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

  const estado: EstadoCamara = !encendida ? 'inactiva' : iniciando ? 'iniciando' : 'activa';

  return (
    <GritCard variant="card" padding="none" className="flex flex-col gap-3.5 p-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-grit-body text-[15px] font-semibold text-grit-text">Escanear QR</h2>
        <p role="status" className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-muted">
          <span
            aria-hidden="true"
            className={cx(
              'h-1.5 w-1.5 rounded-full',
              estado === 'activa' ? 'bg-grit-cyan shadow-[0_0_6px_rgba(20,219,196,0.8)]' : 'bg-grit-muted',
            )}
          />
          {ESTADO_LABEL[estado]}
        </p>
      </div>

      <div
        role="region"
        aria-label="Lector de código QR"
        className="relative flex aspect-square w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[20px] border border-white/[0.07] bg-grit-bg bg-[radial-gradient(circle_at_50%_45%,rgba(20,219,196,0.10),transparent_65%)] sm:aspect-auto sm:h-[316px]"
      >
        <video ref={videoRef} className={cx('absolute inset-0 h-full w-full object-cover', !encendida && 'hidden')} muted playsInline />

        {/* Viewfinder: corner brackets + scan line (xjlmU `GeaBA`) */}
        <div aria-hidden="true" className="pointer-events-none relative z-10 flex h-[170px] w-[170px] items-center justify-center">
          {CORNERS.map((corner) => (
            <span key={corner} className={cx('absolute h-[34px] w-[34px] border-grit-cyan drop-shadow-[0_0_6px_rgba(20,219,196,0.6)]', corner)} />
          ))}
          {(!encendida || iniciando) && (
            <GritIcon name={fallo ? 'videocam_off' : 'qr_code_2'} size={48} className="text-white/20" />
          )}
          <span className="grit-scan-line absolute left-[14px] right-[14px] top-1/2 h-0.5 rounded-full bg-gradient-to-r from-transparent via-grit-cyan to-transparent shadow-[0_0_12px_rgba(20,219,196,0.8)]" />
        </div>

        {!encendida && (
          <div className="relative z-10 flex flex-col items-center gap-3 px-6 text-center">
            {fallo && (
              <p role="alert" className="font-grit-body text-xs text-grit-danger">
                No se pudo acceder a la cámara. Ingresa el código manualmente.
              </p>
            )}
            <GritButton size="lg" icon="photo_camera" onClick={() => setEncendida(true)}>
              Habilitar cámara
            </GritButton>
          </div>
        )}
        {encendida && iniciando && (
          <p className="relative z-10 font-grit-body text-xs text-grit-subtext">Iniciando cámara…</p>
        )}
      </div>

      {encendida && (
        <GritButton variant="secondary" size="sm" icon="videocam_off" onClick={() => setEncendida(false)} className="self-center">
          Desactivar cámara
        </GritButton>
      )}
    </GritCard>
  );
}
