'use client';

import { useEffect, useState } from 'react';
import type { FormularioSeccion } from '@/types/portal/formularios.types';
import { FormularioSeccionContent } from './FormularioSeccionContent';

type FormularioPreviewModalProps = {
  open: boolean;
  plantillaNombre: string;
  secciones: FormularioSeccion[];
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

export function FormularioPreviewModal({
  open,
  plantillaNombre,
  secciones,
  loading = false,
  error = null,
  onClose,
}: FormularioPreviewModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
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
        aria-label="Cerrar vista previa"
        className={[
          'absolute inset-0 bg-slate-950/70 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Vista previa de ${plantillaNombre}`}
        className={[
          'absolute inset-0 flex items-center justify-center p-4 transition-opacity duration-300',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      >
        <div className="glass flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]">
          <header className="flex items-center justify-between border-b border-portal-border px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Vista previa</p>
              <h2 className="text-lg font-semibold text-slate-100">{plantillaNombre}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {loading ? <p className="text-sm text-slate-400">Cargando vista previa...</p> : null}

            {!loading && error ? (
              <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            {!loading && !error && secciones.length === 0 ? (
              <p className="text-sm text-slate-400">Esta plantilla todavía no tiene secciones.</p>
            ) : null}

            {!loading && !error
              ? secciones.map((seccion) => <FormularioSeccionContent key={seccion.id} seccion={seccion} />)
              : null}
          </div>
        </div>
      </div>
    </div>
  );
}
