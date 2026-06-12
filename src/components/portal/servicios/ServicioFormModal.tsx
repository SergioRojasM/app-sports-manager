'use client';

import { useEffect, useState } from 'react';
import type { ServicioFormValues } from '@/types/portal/servicios.types';
import type { Servicio } from '@/types/portal/servicios.types';
import { useServicioForm } from '@/hooks/portal/servicios/useServicioForm';

type ServicioFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  editingServicio: Servicio | null;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (values: ServicioFormValues) => Promise<boolean>;
};

export function ServicioFormModal({
  open,
  mode,
  editingServicio,
  submitError,
  onClose,
  onSubmit,
}: ServicioFormModalProps) {
  const { values, setField, reset, isSubmitting, fieldError, handleSubmit } = useServicioForm({
    initialValues: editingServicio,
  });

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
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const handleFormSubmit = async () => {
    const success = await handleSubmit(async (vals) => {
      const ok = await onSubmit(vals);
      if (ok) reset();
      return ok;
    });
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de servicio"
        className={[
          'absolute inset-0 bg-slate-950/70 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
        className={[
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura el servicio para esta organización.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Nombre */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="servicio-nombre"
            >
              Nombre <span className="text-rose-400">*</span>
            </label>
            <input
              id="servicio-nombre"
              type="text"
              value={values.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="Ej: Clases de Natación"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldError
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldError ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>

          {/* Descripción */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="servicio-descripcion"
            >
              Descripción <span className="normal-case font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="servicio-descripcion"
              rows={3}
              value={values.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)}
              disabled={isSubmitting}
              placeholder="Descripción opcional del servicio"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          {/* Activo */}
          <div className="flex items-center gap-2">
            <input
              id="servicio-activo"
              type="checkbox"
              checked={values.activo}
              onChange={(e) => setField('activo', e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-slate-600 bg-navy-deep"
            />
            <label htmlFor="servicio-activo" className="text-sm text-slate-200">
              Servicio activo
            </label>
          </div>

          {submitError ? (
            <div
              className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-navy-deep hover:text-slate-100"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleFormSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition-all duration-200 hover:bg-turquoise/85 hover:shadow-lg hover:shadow-turquoise/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
          >
            {isSubmitting
              ? 'Guardando...'
              : mode === 'create'
                ? 'Crear servicio'
                : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
