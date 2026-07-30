'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

type RegistrateParaReservarModalProps = {
  open: boolean;
  trainingNombre: string;
  onClose: () => void;
};

export function RegistrateParaReservarModal({ open, trainingNombre, onClose }: RegistrateParaReservarModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registrate-para-reservar-title"
        className="landing-panel w-full max-w-md rounded-2xl border border-landing-border bg-landing-surface-card p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="registrate-para-reservar-title" className="font-landing-display text-xl font-bold text-landing-text">
            Regístrate para reservar
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-landing-text-secondary transition hover:text-landing-text"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <p className="mt-3 font-landing-body text-sm text-landing-text-secondary">
          Para reservar tu cupo en <span className="font-semibold text-landing-text">{trainingNombre}</span> necesitas una
          cuenta en GRIT Arena. Es gratis y toma menos de un minuto.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/auth/signup"
            className="landing-primary-button font-landing-display inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold tracking-[0.04em]"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/auth/login?next=/portal/entrenamientos-publicos"
            className="inline-flex items-center justify-center rounded-lg border border-landing-border px-4 py-2.5 font-landing-body text-sm font-semibold text-landing-text transition hover:border-landing-primary/50 hover:text-landing-primary"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    </div>
  );
}
