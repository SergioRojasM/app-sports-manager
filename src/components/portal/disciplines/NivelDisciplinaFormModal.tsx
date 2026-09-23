'use client';

import { useEffect, useState } from 'react';
import type {
  NivelDisciplinaFormValues,
  NivelDisciplinaFieldErrors,
  NivelDisciplina,
  CreateNivelDisciplinaInput,
  UpdateNivelDisciplinaInput,
} from '@/types/portal/nivel-disciplina.types';

type NivelDisciplinaFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  tenantId: string;
  disciplinaId: string;
  initial?: NivelDisciplina | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onCreate: (input: CreateNivelDisciplinaInput) => Promise<boolean>;
  onUpdate: (id: string, input: UpdateNivelDisciplinaInput) => Promise<boolean>;
};

function validate(values: NivelDisciplinaFormValues): { valid: boolean; errors: NivelDisciplinaFieldErrors } {
  const errors: NivelDisciplinaFieldErrors = {};

  if (!values.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (values.nombre.trim().length > 50) {
    errors.nombre = 'El nombre no puede superar 50 caracteres.';
  }

  const orden = Number(values.orden);
  if (!values.orden || isNaN(orden) || orden < 1 || !Number.isInteger(orden)) {
    errors.orden = 'El orden debe ser un entero mayor a 0.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

const EMPTY: NivelDisciplinaFormValues = { nombre: '', orden: '', activo: true };

export function NivelDisciplinaFormModal({
  open,
  mode,
  tenantId,
  disciplinaId,
  initial,
  isSubmitting,
  submitError,
  onClose,
  onCreate,
  onUpdate,
}: NivelDisciplinaFormModalProps) {
  const [values, setValues] = useState<NivelDisciplinaFormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<NivelDisciplinaFieldErrors>({});

  useEffect(() => {
    if (open && mode === 'edit' && initial) {
      setValues({ nombre: initial.nombre, orden: String(initial.orden), activo: initial.activo });
    } else if (open && mode === 'create') {
      setValues(EMPTY);
    }
    setFieldErrors({});
  }, [open, mode, initial]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose, open]);

  if (!open) return null;

  const handleSubmit = async () => {
    const { valid, errors } = validate(values);
    setFieldErrors(errors);
    if (!valid) return;

    if (mode === 'create') {
      const ok = await onCreate({
        tenantId,
        disciplinaId,
        nombre: values.nombre.trim(),
        orden: Number(values.orden),
        activo: values.activo,
      });
      if (ok) onClose();
    } else if (initial) {
      const ok = await onUpdate(initial.id, {
        nombre: values.nombre.trim(),
        orden: Number(values.orden),
        activo: values.activo,
      });
      if (ok) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de nivel"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear nivel' : 'Editar nivel'}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">
              {mode === 'create' ? 'Crear nivel' : 'Editar nivel'}
            </h2>
            <p className="mt-1 text-xs text-grit-subtext">Define el nombre y orden del nivel de progresión.</p>
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
          <div>
            <label htmlFor="nivel-nombre" className="mb-1 block text-xs text-grit-subtext">Nombre *</label>
            <input
              id="nivel-nombre"
              type="text"
              maxLength={50}
              value={values.nombre}
              onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
              disabled={isSubmitting}
              placeholder="Ej. Principiante"
              className={[
                'w-full rounded-grit-md border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition focus:ring-2',
                fieldErrors.nombre
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
              ].join(' ')}
            />
            {fieldErrors.nombre ? <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">{fieldErrors.nombre}</p> : null}
          </div>

          <div>
            <label htmlFor="nivel-orden" className="mb-1 block text-xs text-grit-subtext">Orden *</label>
            <input
              id="nivel-orden"
              type="number"
              min={1}
              value={values.orden}
              onChange={(e) => setValues((prev) => ({ ...prev, orden: e.target.value }))}
              disabled={isSubmitting}
              placeholder="1"
              className={[
                'w-full rounded-grit-md border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition focus:ring-2',
                fieldErrors.orden
                  ? 'border-grit-danger/80 focus:border-grit-danger/40 focus:ring-grit-danger/35'
                  : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
              ].join(' ')}
            />
            {fieldErrors.orden ? <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">{fieldErrors.orden}</p> : null}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="nivel-activo"
              type="checkbox"
              checked={values.activo}
              onChange={(e) => setValues((prev) => ({ ...prev, activo: e.target.checked }))}
              disabled={isSubmitting}
              className="rounded border-grit-glass-border bg-grit-bg"
            />
            <label htmlFor="nivel-activo" className="text-sm text-grit-text">Nivel activo</label>
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg"
          >
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear nivel' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
