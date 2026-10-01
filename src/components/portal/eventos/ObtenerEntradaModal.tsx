'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';

type ObtenerEntradaModalProps = {
  open: boolean;
  eventoNombre: string;
  signupHref: string;
  loginHref: string;
  onContinuarSinRegistro: () => void;
  onClose: () => void;
};

/**
 * Anonymous get-ticket entry (US-0120): sign up, log in, or continue as a guest.
 * Only shown on the landing surfaces, so it uses the landing styles.
 */
export function ObtenerEntradaModal({
  open,
  eventoNombre,
  signupHref,
  loginHref,
  onContinuarSinRegistro,
  onClose,
}: ObtenerEntradaModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="obtener-entrada-title"
        className="landing-panel w-full max-w-md rounded-2xl border border-landing-border bg-landing-surface-card p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="obtener-entrada-title" className="font-landing-display text-xl font-bold text-landing-text">
            Obtén tu entrada
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
          Para <span className="font-semibold text-landing-text">{eventoNombre}</span> puedes crear una cuenta gratis
          para gestionar tus entradas desde GRIT Arena, o continuar sin registrarte.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={signupHref}
            className="landing-primary-button font-landing-display inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-bold tracking-[0.04em]"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href={loginHref}
            className="inline-flex items-center justify-center rounded-lg border border-landing-border px-4 py-2.5 font-landing-body text-sm font-semibold text-landing-text transition hover:border-landing-primary/50 hover:text-landing-primary"
          >
            Ya tengo cuenta
          </Link>
          <button
            type="button"
            onClick={onContinuarSinRegistro}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 font-landing-body text-sm font-semibold text-landing-text-secondary transition hover:text-landing-primary"
          >
            Continuar sin registro
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </div>

        <p className="mt-4 font-landing-body text-xs text-landing-text-secondary">
          Sin cuenta podrás descargar tu entrada al finalizar. Para verla después en el portal, crea una cuenta con el mismo correo.
        </p>
      </div>
    </div>
  );
}
