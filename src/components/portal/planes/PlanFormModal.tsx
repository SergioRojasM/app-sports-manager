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
import type { Servicio, PlanTipoServicioRow } from '@/types/portal/servicios.types';
import { PlanTipoServiciosSection } from './PlanTipoServiciosSection';

type TipoFormEntry = PlanTipoFormValues & { _id?: string };

type PlanFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit' | 'duplicate';
  isSubmitting: boolean;
  values: PlanFormValues;
  fieldErrors: PlanFieldErrors;
  submitError: string | null;
  disciplines: Discipline[];
  tiposForm: TipoFormEntry[];
  tiposErrors: TipoFieldErrors;
  tiposGlobalError: string | null;
  tiposServiceRows: PlanTipoServicioRow[][];
  availableServices: Servicio[];
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: PlanFormField | 'activo', value: string | boolean | string[]) => void;
  onAddTipo: () => void;
  onUpdateTipo: (index: number, values: Partial<PlanTipoFormValues>) => void;
  onRemoveTipo: (index: number) => void;
  onUpdateTipoServiceRows: (index: number, rows: PlanTipoServicioRow[]) => void;
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
  tiposServiceRows,
  availableServices,
  onClose,
  onSubmit,
  onChangeField,
  onAddTipo,
  onUpdateTipo,
  onRemoveTipo,
  onUpdateTipoServiceRows,
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

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [open]);

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
        aria-label={mode === 'edit' ? 'Editar plan' : mode === 'duplicate' ? 'Duplicar plan' : 'Crear plan'}
        className={[
          'absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">
              {mode === 'edit' ? 'Editar plan' : mode === 'duplicate' ? 'Duplicar plan' : 'Crear plan'}
            </h2>
            <p className="mt-1 text-xs text-grit-subtext">
              Configura los datos del plan para esta organización.
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
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor="plan-nombre">
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

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor="plan-descripcion">
              Descripción
            </label>
            <textarea
              id="plan-descripcion"
              rows={3}
              value={values.descripcion}
              onChange={(event) => onChangeField('descripcion', event.target.value)}
              disabled={isSubmitting}
              placeholder="Descripción opcional del plan"
              className="w-full rounded-grit-lg border border-grit-glass-border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
            />
          </div>

          {/* Type (virtual / presencial) */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext" htmlFor="plan-tipo">
              Tipo
            </label>
            <select
              id="plan-tipo"
              value={values.tipo}
              onChange={(event) => onChangeField('tipo', event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-grit-lg border border-grit-glass-border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
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
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">
                Subtipos de plan
              </span>
              <button
                type="button"
                onClick={onAddTipo}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-grit-md border border-grit-cyan/40 bg-grit-cyan/10 px-2.5 py-1.5 text-xs font-semibold text-grit-cyan transition hover:bg-grit-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                Agregar subtipo
              </button>
            </div>

            {tiposGlobalError ? (
              <p className="mb-2 text-xs font-medium text-grit-danger" role="alert">
                {tiposGlobalError}
              </p>
            ) : null}

            {tiposForm.length === 0 ? (
              <p className="rounded-grit-md border border-grit-glass-border bg-grit-bg/40 px-4 py-3 text-sm text-grit-muted">
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
                      className="rounded-grit-lg border border-grit-glass-border bg-grit-bg/60 p-3 space-y-2 transition-all duration-200 hover:border-grit-cyan/40 hover:bg-grit-bg/80 hover:shadow-lg hover:shadow-grit-cyan/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-grit-subtext">
                          Subtipo {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-grit-subtext">
                            <input
                              type="checkbox"
                              checked={tipo.activo}
                              onChange={(e) => onUpdateTipo(index, { activo: e.target.checked })}
                              disabled={isSubmitting}
                              className="rounded border-grit-glass-border bg-grit-bg"
                            />
                            Activo
                          </label>
                          <button
                            type="button"
                            onClick={() => onRemoveTipo(index)}
                            disabled={isSubmitting}
                            className="rounded p-1 text-grit-subtext transition hover:text-grit-danger disabled:cursor-not-allowed"
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
                              'w-full rounded-grit-md border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-1',
                              getError('nombre')
                                ? 'border-grit-danger/80 focus:ring-grit-danger/35'
                                : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
                            ].join(' ')}
                          />
                          {getError('nombre') ? (
                            <p className="mt-0.5 text-xs text-grit-danger">{getError('nombre')}</p>
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
                              'w-full rounded-grit-md border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-1',
                              getError('precio')
                                ? 'border-grit-danger/80 focus:ring-grit-danger/35'
                                : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
                            ].join(' ')}
                          />
                          {getError('precio') ? (
                            <p className="mt-0.5 text-xs text-grit-danger">{getError('precio')}</p>
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
                              'w-full rounded-grit-md border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:ring-1',
                              getError('vigencia_dias')
                                ? 'border-grit-danger/80 focus:ring-grit-danger/35'
                                : 'border-grit-glass-border focus:border-grit-cyan focus:ring-grit-cyan/35',
                            ].join(' ')}
                          />
                          {getError('vigencia_dias') ? (
                            <p className="mt-0.5 text-xs text-grit-danger">{getError('vigencia_dias')}</p>
                          ) : null}
                        </div>

                        <div className="col-span-2">
                          <input
                            type="text"
                            value={tipo.descripcion}
                            onChange={(e) => onUpdateTipo(index, { descripcion: e.target.value })}
                            disabled={isSubmitting}
                            placeholder="Descripción (opcional)"
                            className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-1 focus:ring-grit-cyan/35"
                          />
                        </div>
                      </div>

                      {/* Services section for this plan tipo */}
                      <PlanTipoServiciosSection
                        index={index}
                        serviceRows={tiposServiceRows[index] ?? []}
                        availableServices={availableServices}
                        isSubmitting={isSubmitting}
                        onAddRow={() => {
                          const current = tiposServiceRows[index] ?? [];
                          onUpdateTipoServiceRows(index, [...current, { servicioId: '', unidades: null }]);
                        }}
                        onUpdateRow={(rowIndex, partial) => {
                          const current = [...(tiposServiceRows[index] ?? [])];
                          current[rowIndex] = { ...current[rowIndex], ...partial };
                          onUpdateTipoServiceRows(index, current);
                        }}
                        onRemoveRow={(rowIndex) => {
                          const current = (tiposServiceRows[index] ?? []).filter((_, i) => i !== rowIndex);
                          onUpdateTipoServiceRows(index, current);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Benefits (tag input) */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">
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
                className="flex-1 rounded-grit-lg border border-grit-glass-border bg-grit-bg px-4 py-3 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
              />
              <button
                type="button"
                onClick={addBeneficio}
                disabled={isSubmitting || !beneficioInput.trim()}
                className="rounded-grit-md border border-grit-cyan/40 bg-grit-cyan/10 px-3 py-2 text-sm font-semibold text-grit-cyan transition hover:bg-grit-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
              </button>
            </div>
            {values.beneficios.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {values.beneficios.map((beneficio, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between gap-2 rounded-grit-md border border-grit-glass-border bg-grit-bg/60 px-3 py-2 text-sm text-grit-text"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-grit-cyan" aria-hidden="true">check_circle</span>
                      {beneficio}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBeneficio(index)}
                      disabled={isSubmitting}
                      className="rounded p-0.5 text-grit-subtext transition hover:text-grit-danger disabled:cursor-not-allowed"
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
              className="rounded border-grit-glass-border bg-grit-bg"
            />
            <label htmlFor="plan-active" className="text-sm text-grit-text">
              Plan activo
            </label>
          </div>

          {/* Public toggle */}
          <div>
            <div className="flex items-center gap-2">
              <input
                id="plan-public"
                type="checkbox"
                checked={values.es_publico}
                onChange={(event) => onChangeField('es_publico', event.target.checked)}
                disabled={isSubmitting}
                className="rounded border-grit-glass-border bg-grit-bg"
              />
              <label htmlFor="plan-public" className="text-sm text-grit-text">
                Plan público
              </label>
            </div>
            <p className="mt-1 pl-6 text-xs text-grit-subtext">
              Los planes públicos pueden ser vistos y adquiridos por personas que no pertenecen a la
              organización.
            </p>
          </div>

          {/* Disciplines multi-select */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">
              Disciplinas <span className="normal-case font-normal text-grit-muted">(opcional)</span>
            </span>
            {activeDisciplines.length === 0 ? (
              <p className="rounded-grit-md border border-amber-400/40 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
                No hay disciplinas activas disponibles. Crea disciplinas primero.
              </p>
            ) : (
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-grit-lg border border-grit-glass-border bg-grit-bg p-3">
                {activeDisciplines.map((discipline) => (
                  <label
                    key={discipline.id}
                    className="flex items-center gap-2 rounded-grit-md px-2 py-1.5 text-sm text-grit-text transition hover:bg-grit-card"
                  >
                    <input
                      type="checkbox"
                      checked={values.disciplinaIds.includes(discipline.id)}
                      onChange={() => handleDisciplineToggle(discipline.id)}
                      disabled={isSubmitting}
                      className="rounded border-grit-glass-border bg-grit-bg"
                    />
                    {discipline.nombre}
                  </label>
                ))}
              </div>
            )}
            {fieldErrors.disciplinaIds ? (
              <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
                {fieldErrors.disciplinaIds}
              </p>
            ) : null}
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
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text transition-all duration-200 hover:border-grit-glass-border hover:bg-grit-bg hover:text-grit-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg transition-all duration-200 hover:bg-grit-cyan/85 hover:shadow-lg hover:shadow-grit-cyan/25 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"
          >
            {isSubmitting ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear plan'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
