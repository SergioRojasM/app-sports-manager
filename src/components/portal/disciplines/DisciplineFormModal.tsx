'use client';

import { useEffect } from 'react';
import type {
  DisciplineFieldErrors,
  DisciplineFormValues,
} from '@/types/portal/disciplines.types';

type DisciplineFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  values: DisciplineFormValues;
  fieldErrors: DisciplineFieldErrors;
  submitError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof DisciplineFormValues, value: string | boolean) => void;
};

export function DisciplineFormModal({
  open,
  mode,
  isSubmitting,
  values,
  fieldErrors,
  submitError,
  onClose,
  onSubmit,
  onChangeField,
}: DisciplineFormModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de disciplina"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear disciplina' : 'Editar disciplina'}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">
              {mode === 'create' ? 'Create discipline' : 'Edit discipline'}
            </h2>
            <p className="mt-1 text-xs text-grit-subtext">
              Configure discipline data for this organization.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor="discipline-nombre">
              Name
            </label>
            <input
              id="discipline-nombre"
              type="text"
              value={values.nombre}
              onChange={(event) => onChangeField('nombre', event.target.value)}
              disabled={isSubmitting}
              placeholder="Basketball"
              className={[
                'w-full rounded-grit-lg border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-2',
                fieldErrors.nombre
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
              ].join(' ')}
            />
            {fieldErrors.nombre ? (
              <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldErrors.nombre}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor="discipline-descripcion">
              Description
            </label>
            <textarea
              id="discipline-descripcion"
              rows={4}
              value={values.descripcion}
              onChange={(event) => onChangeField('descripcion', event.target.value)}
              disabled={isSubmitting}
              placeholder="Optional discipline description"
              className={[
                'w-full rounded-grit-lg border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-2',
                fieldErrors.descripcion
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
              ].join(' ')}
            />
            {fieldErrors.descripcion ? (
              <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldErrors.descripcion}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="discipline-active"
              type="checkbox"
              checked={values.activo}
              onChange={(event) => onChangeField('activo', event.target.checked)}
              disabled={isSubmitting}
              className="rounded border-grit-glass-border bg-grit-bg"
            />
            <label htmlFor="discipline-active" className="text-sm text-grit-text">
              Discipline active
            </label>
          </div>

          {submitError ? (
            <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg"
          >
            {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create discipline' : 'Save changes'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}