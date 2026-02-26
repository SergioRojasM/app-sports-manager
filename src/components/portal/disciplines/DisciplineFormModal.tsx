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
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear disciplina' : 'Editar disciplina'}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Create discipline' : 'Edit discipline'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configure discipline data for this organization.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="discipline-nombre">
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
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.nombre
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.nombre ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.nombre}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="discipline-descripcion">
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
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.descripcion
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.descripcion ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
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
              className="rounded border-slate-600 bg-navy-deep"
            />
            <label htmlFor="discipline-active" className="text-sm text-slate-200">
              Discipline active
            </label>
          </div>

          {submitError ? (
            <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep"
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