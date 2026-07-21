'use client';

import { useEffect, useState } from 'react';
import { useFormularioCampoForm } from '@/hooks/portal/formularios/useFormularioCampoForm';
import {
  FORMULARIO_TIPOS_CAMPO,
  FORMULARIO_TIPO_CAMPO_LABELS,
  type FormularioCampo,
  type FormularioCampoFormValues,
} from '@/types/portal/formularios.types';

type FormularioCampoFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  editingCampo: FormularioCampo | null;
  defaultOrden: number;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (values: FormularioCampoFormValues) => Promise<boolean>;
};

export function FormularioCampoFormModal({
  open,
  mode,
  editingCampo,
  defaultOrden,
  submitError,
  onClose,
  onSubmit,
}: FormularioCampoFormModalProps) {
  const { values, setField, reset, isSubmitting, fieldError, handleSubmit } = useFormularioCampoForm({
    initialValues: editingCampo,
    defaultOrden,
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
        aria-label="Cerrar formulario de campo"
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
        aria-label={mode === 'create' ? 'Agregar campo' : 'Editar campo'}
        className={[
          'absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Agregar campo' : 'Editar campo'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">Define cómo se recogerá este dato en el formulario.</p>
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
          {/* Etiqueta */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="campo-etiqueta">
              Etiqueta <span className="text-rose-400">*</span>
            </label>
            <input
              id="campo-etiqueta"
              type="text"
              value={values.campo_etiqueta}
              onChange={(e) => setField('campo_etiqueta', e.target.value)}
              disabled={isSubmitting}
              maxLength={150}
              placeholder="Ej: Peso (kg)"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          {/* Nombre interno */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="campo-nombre">
              Nombre interno <span className="text-rose-400">*</span>
            </label>
            <input
              id="campo-nombre"
              type="text"
              value={values.campo_nombre}
              onChange={(e) => setField('campo_nombre', e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="peso_kg"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 font-mono text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
            <p className="mt-1 text-xs text-slate-500">
              Clave interna usada al guardar las respuestas. Solo minúsculas, números y guiones bajos.
            </p>
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="campo-tipo">
              Tipo de campo <span className="text-rose-400">*</span>
            </label>
            <select
              id="campo-tipo"
              value={values.campo_tipo}
              onChange={(e) => setField('campo_tipo', e.target.value as FormularioCampoFormValues['campo_tipo'])}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            >
              {FORMULARIO_TIPOS_CAMPO.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {FORMULARIO_TIPO_CAMPO_LABELS[tipo]}
                </option>
              ))}
            </select>
          </div>

          {/* Valores de lista (solo cuando tipo = lista) */}
          {values.campo_tipo === 'lista' ? (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="campo-lista-valores">
                Valores permitidos <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="campo-lista-valores"
                rows={3}
                value={values.campo_lista_valores}
                onChange={(e) => setField('campo_lista_valores', e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Camiseta S, Camiseta M, Camiseta L"
                className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
              <p className="mt-1 text-xs text-slate-500">Valores separados por coma.</p>
            </div>
          ) : null}

          {/* Orden */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="campo-orden">
              Orden <span className="text-rose-400">*</span>
            </label>
            <input
              id="campo-orden"
              type="number"
              min={0}
              value={values.orden}
              onChange={(e) => setField('orden', e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          {/* Obligatorio */}
          <div className="flex items-center gap-2">
            <input
              id="campo-obligatorio"
              type="checkbox"
              checked={values.campo_obligatorio}
              onChange={(e) => setField('campo_obligatorio', e.target.checked)}
              disabled={isSubmitting}
              className="rounded border-slate-600 bg-navy-deep"
            />
            <label htmlFor="campo-obligatorio" className="text-sm text-slate-200">
              Campo obligatorio
            </label>
          </div>

          {(fieldError || submitError) ? (
            <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
              {fieldError ?? submitError}
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
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Agregar campo' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
