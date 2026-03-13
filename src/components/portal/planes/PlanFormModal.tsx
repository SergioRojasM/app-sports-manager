'use client';

import { useEffect, useState } from 'react';
import type { Discipline } from '@/types/portal/disciplines.types';
import type {
  PlanFieldErrors,
  PlanFormValues,
  PlanFormField,
} from '@/types/portal/planes.types';

type PlanFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  values: PlanFormValues;
  fieldErrors: PlanFieldErrors;
  submitError: string | null;
  disciplines: Discipline[];
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: PlanFormField | 'activo', value: string | boolean | string[]) => void;
};

export function PlanFormModal({
  open,
  mode,
  isSubmitting,
  values,
  fieldErrors,
  submitError,
  disciplines,
  onClose,
  onSubmit,
  onChangeField,
}: PlanFormModalProps) {
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

  // Beneficios tag input state (must be before early return)
  const [beneficioInput, setBeneficioInput] = useState('');

  if (!open) {
    return null;
  }

  const activeDisciplines = disciplines.filter((d) => d.activo);

  const handleDisciplineToggle = (disciplinaId: string) => {
    const current = values.disciplinaIds;
    const next = current.includes(disciplinaId)
      ? current.filter((id) => id !== disciplinaId)
      : [...current, disciplinaId];
    onChangeField('disciplinaIds', next);
  };

  const addBeneficio = () => {
    const text = beneficioInput.trim();
    if (!text) return;
    if (values.beneficios.includes(text)) {
      setBeneficioInput('');
      return;
    }
    onChangeField('beneficios', [...values.beneficios, text]);
    setBeneficioInput('');
  };

  const removeBeneficio = (index: number) => {
    onChangeField('beneficios', values.beneficios.filter((_, i) => i !== index));
  };

  const handleBeneficioKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addBeneficio();
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de plan"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear plan' : 'Editar plan'}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Crear plan' : 'Editar plan'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura los datos del plan para esta organización.
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
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-nombre">
              Nombre
            </label>
            <input
              id="plan-nombre"
              type="text"
              value={values.nombre}
              onChange={(event) => onChangeField('nombre', event.target.value)}
              disabled={isSubmitting}
              placeholder="Plan Básico Mensual"
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

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-descripcion">
              Descripción
            </label>
            <textarea
              id="plan-descripcion"
              rows={3}
              value={values.descripcion}
              onChange={(event) => onChangeField('descripcion', event.target.value)}
              disabled={isSubmitting}
              placeholder="Descripción opcional del plan"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          {/* Price */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-precio">
              Precio
            </label>
            <input
              id="plan-precio"
              type="number"
              min="0"
              step="0.01"
              value={values.precio}
              onChange={(event) => onChangeField('precio', event.target.value)}
              disabled={isSubmitting}
              placeholder="0.00"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.precio
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.precio ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.precio}
              </p>
            ) : null}
          </div>

          {/* Validity (months) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-vigencia">
              Vigencia (meses)
            </label>
            <input
              id="plan-vigencia"
              type="number"
              min="1"
              step="1"
              value={values.vigencia_meses}
              onChange={(event) => onChangeField('vigencia_meses', event.target.value)}
              disabled={isSubmitting}
              placeholder="1"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.vigencia_meses
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.vigencia_meses ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.vigencia_meses}
              </p>
            ) : null}
          </div>

          {/* Classes included */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-clases">
              Clases incluidas
            </label>
            <input
              id="plan-clases"
              type="number"
              min="0"
              step="1"
              value={values.clases_incluidas}
              onChange={(event) => onChangeField('clases_incluidas', event.target.value)}
              disabled={isSubmitting}
              placeholder="Opcional"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.clases_incluidas
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.clases_incluidas ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.clases_incluidas}
              </p>
            ) : null}
          </div>

          {/* Type (virtual / presencial) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plan-tipo">
              Tipo
            </label>
            <select
              id="plan-tipo"
              value={values.tipo}
              onChange={(event) => onChangeField('tipo', event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            >
              <option value="">— Seleccionar tipo —</option>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="mixto">Mixto</option>
            </select>
          </div>

          {/* Benefits (tag input) */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Beneficios
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={beneficioInput}
                onChange={(event) => setBeneficioInput(event.target.value)}
                onKeyDown={handleBeneficioKeyDown}
                disabled={isSubmitting}
                placeholder="Escribe un beneficio y presiona Enter"
                className="flex-1 rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
              <button
                type="button"
                onClick={addBeneficio}
                disabled={isSubmitting || !beneficioInput.trim()}
                className="rounded-lg border border-turquoise/40 bg-turquoise/10 px-3 py-2 text-sm font-semibold text-turquoise transition hover:bg-turquoise/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
              </button>
            </div>
            {values.beneficios.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {values.beneficios.map((beneficio, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-navy-deep/60 px-3 py-2 text-sm text-slate-200"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-turquoise" aria-hidden="true">check_circle</span>
                      {beneficio}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBeneficio(index)}
                      disabled={isSubmitting}
                      className="rounded p-0.5 text-slate-400 transition hover:text-rose-300 disabled:cursor-not-allowed"
                      aria-label={`Eliminar beneficio: ${beneficio}`}
                    >
                      <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-2">
            <input
              id="plan-active"
              type="checkbox"
              checked={values.activo}
              onChange={(event) => onChangeField('activo', event.target.checked)}
              disabled={isSubmitting}
              className="rounded border-slate-600 bg-navy-deep"
            />
            <label htmlFor="plan-active" className="text-sm text-slate-200">
              Plan activo
            </label>
          </div>

          {/* Disciplines multi-select */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Disciplinas <span className="normal-case font-normal text-slate-500">(opcional)</span>
            </span>
            {activeDisciplines.length === 0 ? (
              <p className="rounded-lg border border-amber-400/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
                No hay disciplinas activas disponibles. Crea disciplinas primero.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-700 bg-navy-deep p-3">
                {activeDisciplines.map((discipline) => (
                  <label
                    key={discipline.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 transition hover:bg-navy-medium/60"
                  >
                    <input
                      type="checkbox"
                      checked={values.disciplinaIds.includes(discipline.id)}
                      onChange={() => handleDisciplineToggle(discipline.id)}
                      disabled={isSubmitting}
                      className="rounded border-slate-600 bg-navy-deep"
                    />
                    {discipline.nombre}
                  </label>
                ))}
              </div>
            )}
            {fieldErrors.disciplinaIds ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.disciplinaIds}
              </p>
            ) : null}
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
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear plan' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
