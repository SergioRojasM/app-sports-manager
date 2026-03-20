'use client';

import { useEffect, useState } from 'react';
import type { Discipline } from '@/types/portal/disciplines.types';
import type {
  PlanFieldErrors,
  PlanFormValues,
  PlanFormField,
  PlanTipoFormValues,
} from '@/types/portal/planes.types';
import type { TipoFieldErrors } from '@/hooks/portal/planes/usePlanForm';

type TipoFormEntry = PlanTipoFormValues & { _id?: string };

type PlanFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isSubmitting: boolean;
  values: PlanFormValues;
  fieldErrors: PlanFieldErrors;
  submitError: string | null;
  disciplines: Discipline[];
  tiposForm: TipoFormEntry[];
  tiposErrors: TipoFieldErrors;
  tiposGlobalError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: PlanFormField | 'activo', value: string | boolean | string[]) => void;
  onAddTipo: () => void;
  onUpdateTipo: (index: number, values: Partial<PlanTipoFormValues>) => void;
  onRemoveTipo: (index: number) => void;
};

export function PlanFormModal({
  open,
  mode,
  isSubmitting,
  values,
  fieldErrors,
  submitError,
  disciplines,
  tiposForm,
  tiposErrors,
  tiposGlobalError,
  onClose,
  onSubmit,
  onChangeField,
  onAddTipo,
  onUpdateTipo,
  onRemoveTipo,
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

          {/* Subtipos (plan_tipos) inline rows */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Subtipos de plan
              </span>
              <button
                type="button"
                onClick={onAddTipo}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg border border-turquoise/40 bg-turquoise/10 px-2.5 py-1.5 text-xs font-semibold text-turquoise transition hover:bg-turquoise/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                Agregar subtipo
              </button>
            </div>

            {tiposGlobalError ? (
              <p className="mb-2 text-xs font-medium text-rose-300" role="alert">
                {tiposGlobalError}
              </p>
            ) : null}

            {tiposForm.length === 0 ? (
              <p className="rounded-lg border border-slate-700/50 bg-navy-deep/40 px-4 py-3 text-sm text-slate-500">
                Sin subtipos. Agrega al menos uno para ofrecer opciones de suscripción.
              </p>
            ) : (
              <div className="space-y-3">
                {tiposForm.map((tipo, index) => {
                  const errorsForRow = tiposErrors.filter((e) => e.index === index);
                  const getError = (field: string) => errorsForRow.find((e) => e.field === field)?.message;

                  return (
                    <div
                      key={tipo._id ?? `new-${index}`}
                      className="rounded-xl border border-slate-700 bg-navy-deep/60 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">
                          Subtipo {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-slate-300">
                            <input
                              type="checkbox"
                              checked={tipo.activo}
                              onChange={(e) => onUpdateTipo(index, { activo: e.target.checked })}
                              disabled={isSubmitting}
                              className="rounded border-slate-600 bg-navy-deep"
                            />
                            Activo
                          </label>
                          <button
                            type="button"
                            onClick={() => onRemoveTipo(index)}
                            disabled={isSubmitting}
                            className="rounded p-1 text-slate-400 transition hover:text-rose-300 disabled:cursor-not-allowed"
                            aria-label={`Eliminar subtipo ${index + 1}`}
                          >
                            <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={tipo.nombre}
                            onChange={(e) => onUpdateTipo(index, { nombre: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Nombre del subtipo"
                            className={[
                              'w-full rounded-lg border bg-navy-deep px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-1',
                              getError('nombre')
                                ? 'border-rose-400/80 focus:ring-rose-300/35'
                                : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
                            ].join(' ')}
                          />
                          {getError('nombre') ? (
                            <p className="mt-0.5 text-xs text-rose-300">{getError('nombre')}</p>
                          ) : null}
                        </div>

                        <div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={tipo.precio}
                            onChange={(e) => onUpdateTipo(index, { precio: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Precio"
                            className={[
                              'w-full rounded-lg border bg-navy-deep px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-1',
                              getError('precio')
                                ? 'border-rose-400/80 focus:ring-rose-300/35'
                                : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
                            ].join(' ')}
                          />
                          {getError('precio') ? (
                            <p className="mt-0.5 text-xs text-rose-300">{getError('precio')}</p>
                          ) : null}
                        </div>

                        <div>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={tipo.vigencia_dias}
                            onChange={(e) => onUpdateTipo(index, { vigencia_dias: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Vigencia (días)"
                            className={[
                              'w-full rounded-lg border bg-navy-deep px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-1',
                              getError('vigencia_dias')
                                ? 'border-rose-400/80 focus:ring-rose-300/35'
                                : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
                            ].join(' ')}
                          />
                          {getError('vigencia_dias') ? (
                            <p className="mt-0.5 text-xs text-rose-300">{getError('vigencia_dias')}</p>
                          ) : null}
                        </div>

                        <div>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={tipo.clases_incluidas}
                            onChange={(e) => onUpdateTipo(index, { clases_incluidas: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Clases incluidas"
                            className={[
                              'w-full rounded-lg border bg-navy-deep px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-1',
                              getError('clases_incluidas')
                                ? 'border-rose-400/80 focus:ring-rose-300/35'
                                : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
                            ].join(' ')}
                          />
                          {getError('clases_incluidas') ? (
                            <p className="mt-0.5 text-xs text-rose-300">{getError('clases_incluidas')}</p>
                          ) : null}
                        </div>

                        <div className="col-span-2">
                          <input
                            type="text"
                            value={tipo.descripcion}
                            onChange={(e) => onUpdateTipo(index, { descripcion: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Descripción (opcional)"
                            className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-1 focus:ring-turquoise/35"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
