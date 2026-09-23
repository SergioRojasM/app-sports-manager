'use client';

import { useEffect, useState } from 'react';

type PublicTrainingBannerModalProps = {
  open: boolean;
  bannerUrl: string;
  alt: string;
  onClose: () => void;
};

export function PublicTrainingBannerModal({ open, bannerUrl, alt, onClose }: PublicTrainingBannerModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => {
      cancelAnimationFrame(frame);
      setVisible(false);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar imagen (fondo)"
        tabIndex={-1}
        className={[
          'absolute inset-0 bg-grit-bg/70 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Imagen de ${alt}`}
        className={[
          'absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      >
        <div className="relative max-h-[90vh] w-full max-w-4xl">
          <button
            type="button"
            aria-label="Cerrar imagen"
            onClick={onClose}
            className="absolute -top-11 right-0 rounded-grit-md border border-grit-glass-border bg-grit-card p-2 text-grit-text transition hover:text-grit-cyan"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bannerUrl}
            alt={alt}
            className="max-h-[90vh] w-full rounded-grit-2xl border border-grit-glass-border object-contain"
          />
        </div>
      </div>
    </div>
  );
}
