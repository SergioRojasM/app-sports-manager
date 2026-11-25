'use client';

import { useEffect, useState } from 'react';
import type { FormularioPlantillaFormValues } from '@/types/portal/formularios.types';
import { useFormularioForm } from '@/hooks/portal/formularios/useFormularioForm';

type FormularioFormModalProps = {
  open: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (values: FormularioPlantillaFormValues) => Promise<boolean>;
};

export function FormularioFormModal({ open, submitError, onClose, onSubmit }: FormularioFormModalProps) {
  const { values, setField, reset, isSubmitting, fieldError, handleSubmit } = useFormularioForm();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      reset();
    }
  }, [open, reset]);

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
    await handleSubmit(async (vals) => onSubmit(vals));
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de plantilla"
        className={[
          'absolute inset-0 bg-grit-bg/70 backdrop-blur-sm transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Nueva plantilla"
        className={[
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">Nueva plantilla</h2>
            <p className="mt-1 text-xs text-grit-subtext">
              Dale un nombre a tu plantilla; luego podrás construirla sección por sección.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Nombre */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext"
              htmlFor="plantilla-nombre"
            >
              Nombre <span className="text-grit-danger">*</span>
            </label>
            <input
              id="plantilla-nombre"
              type="text"
              value={values.nombre}
              onChange={(e) => setField('nombre', e.target.value)}
              disabled={isSubmitting}
              maxLength={150}
              placeholder="Ej: Ficha médica de ingreso"
              className={[
                'w-full rounded-grit-lg border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-2',
                fieldError
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
              ].join(' ')}
            />
            {fieldError ? (
              <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>

          {/* Descripción */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext"
              htmlFor="plantilla-descripcion"
            >
              Descripción <span className="normal-case font-normal text-grit-muted">(opcional)</span>
            </label>
            <textarea
              id="plantilla-descripcion"
              rows={3}
              value={values.descripcion}
              onChange={(e) => setField('descripcion', e.target.value)}
              disabled={isSubmitting}
              placeholder="Descripción opcional de la plantilla"
              className="w-full rounded-grit-lg border border-grit-glass-border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
            />
          </div>

          {submitError ? (
            <div
              className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text transition-all duration-200 hover:border-grit-glass-border hover:bg-grit-bg hover:text-grit-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleFormSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg transition-all duration-200 hover:bg-grit-cyan/85 hover:shadow-lg hover:shadow-grit-cyan/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
          >
            {isSubmitting ? 'Creando...' : 'Crear plantilla'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
