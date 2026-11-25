'use client';

import { useState } from 'react';
import {
  GritAlert,
  GritButton,
  GritCard,
  GritDrawer,
  GritField,
  GritIcon,
  GritIconButton,
  GritSectionHeading,
  GritSwitch,
  cx,
  gritDescribedBy,
  gritInputClass,
  gritInputInvalidClass,
  gritSelectClass,
} from '@/components/ui';
import type { Discipline } from '@/types/portal/disciplines.types';
import {
  PLAN_ESTADO_LABELS,
  getPlanEstado,
  type PlanEstado,
  type PlanFieldErrors,
  type PlanFormValues,
  type PlanFormField,
  type PlanTipoFormValues,
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
  onChangeEstado: (estado: PlanEstado) => void;
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
  onChangeEstado,
  onAddTipo,
  onUpdateTipo,
  onRemoveTipo,
  onUpdateTipoServiceRows,
}: PlanFormModalProps) {
  const [beneficioInput, setBeneficioInput] = useState('');

  const activeDisciplines = disciplines.filter((d) => d.activo);
  const estado = getPlanEstado(values);
  const isHidden = estado === 'activo_no_visible';
  const title = mode === 'edit' ? 'Editar plan' : mode === 'duplicate' ? 'Duplicar plan' : 'Crear plan';

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

  const legendClass = 'mb-2 font-grit-body text-xs font-semibold text-grit-subtext';

  return (
    <GritDrawer
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      title={title}
      subtitle="Configura los datos del plan para esta organización."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void onSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'edit' ? 'Guardar cambios' : 'Crear plan'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <GritField htmlFor="plan-nombre" label="Nombre" error={fieldErrors.nombre}>
          <input
            id="plan-nombre"
            type="text"
            value={values.nombre}
            onChange={(event) => onChangeField('nombre', event.target.value)}
            disabled={isSubmitting}
            placeholder="Plan Básico Mensual"
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={gritDescribedBy('plan-nombre', undefined, fieldErrors.nombre)}
            className={fieldErrors.nombre ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="plan-descripcion" label="Descripción" optional>
          <textarea
            id="plan-descripcion"
            rows={3}
            value={values.descripcion}
            onChange={(event) => onChangeField('descripcion', event.target.value)}
            disabled={isSubmitting}
            placeholder="Descripción del plan"
            className={gritInputClass}
          />
        </GritField>

        <GritField htmlFor="plan-tipo" label="Modalidad">
          <select
            id="plan-tipo"
            value={values.tipo}
            onChange={(event) => onChangeField('tipo', event.target.value)}
            disabled={isSubmitting}
            className={cx('grit-select-chevron', gritSelectClass)}
          >
            <option value="">— Seleccionar modalidad —</option>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="mixto">Mixto</option>
          </select>
        </GritField>

        <GritCard as="section" variant="inset" padding="sm" className="space-y-3">
          <GritSectionHeading
            as="h3"
            size="md"
            title="Subtipos de plan"
            subtitle="Cada subtipo es una opción de suscripción con su precio y vigencia."
            action={
              <GritButton size="sm" variant="outline-accent" icon="add" onClick={onAddTipo} disabled={isSubmitting}>
                Agregar subtipo
              </GritButton>
            }
          />

          {tiposGlobalError ? <GritAlert tone="danger">{tiposGlobalError}</GritAlert> : null}

          {tiposForm.length === 0 ? (
            <p className="font-grit-body text-xs text-grit-muted">
              Sin subtipos. Agrega al menos uno para ofrecer opciones de suscripción.
            </p>
          ) : (
            <div className="space-y-3">
              {tiposForm.map((tipo, index) => {
                const errorsForRow = tiposErrors.filter((e) => e.index === index);
                const getError = (field: string) => errorsForRow.find((e) => e.field === field)?.message;
                const id = (field: string) => `plan-tipo-${index}-${field}`;

                return (
                  <div
                    key={tipo._id ?? `new-${index}`}
                    className="space-y-3 rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-grit-body text-xs font-semibold text-grit-subtext">Subtipo {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <GritSwitch
                          checked={tipo.activo}
                          onChange={(next) => onUpdateTipo(index, { activo: next })}
                          disabled={isSubmitting}
                          label={`Subtipo ${index + 1} activo`}
                        />
                        <GritIconButton
                          icon="delete"
                          label={`Eliminar subtipo ${index + 1}`}
                          size="sm"
                          variant="ghost"
                          onClick={() => onRemoveTipo(index)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <GritField htmlFor={id('nombre')} label="Nombre" error={getError('nombre')} className="sm:col-span-2">
                        <input
                          id={id('nombre')}
                          type="text"
                          value={tipo.nombre}
                          onChange={(e) => onUpdateTipo(index, { nombre: e.target.value })}
                          disabled={isSubmitting}
                          placeholder="Ej: Mensual"
                          aria-invalid={getError('nombre') ? true : undefined}
                          aria-describedby={gritDescribedBy(id('nombre'), undefined, getError('nombre'))}
                          className={getError('nombre') ? gritInputInvalidClass : gritInputClass}
                        />
                      </GritField>
                      <GritField htmlFor={id('precio')} label="Precio" error={getError('precio')}>
                        <input
                          id={id('precio')}
                          type="number"
                          min="0"
                          step="0.01"
                          value={tipo.precio}
                          onChange={(e) => onUpdateTipo(index, { precio: e.target.value })}
                          disabled={isSubmitting}
                          placeholder="120000"
                          aria-invalid={getError('precio') ? true : undefined}
                          aria-describedby={gritDescribedBy(id('precio'), undefined, getError('precio'))}
                          className={getError('precio') ? gritInputInvalidClass : gritInputClass}
                        />
                      </GritField>
                      <GritField htmlFor={id('vigencia')} label="Vigencia (días)" error={getError('vigencia_dias')}>
                        <input
                          id={id('vigencia')}
                          type="number"
                          min="1"
                          step="1"
                          value={tipo.vigencia_dias}
                          onChange={(e) => onUpdateTipo(index, { vigencia_dias: e.target.value })}
                          disabled={isSubmitting}
                          placeholder="30"
                          aria-invalid={getError('vigencia_dias') ? true : undefined}
                          aria-describedby={gritDescribedBy(id('vigencia'), undefined, getError('vigencia_dias'))}
                          className={getError('vigencia_dias') ? gritInputInvalidClass : gritInputClass}
                        />
                      </GritField>
                      <GritField htmlFor={id('descripcion')} label="Descripción" optional className="sm:col-span-2">
                        <input
                          id={id('descripcion')}
                          type="text"
                          value={tipo.descripcion}
                          onChange={(e) => onUpdateTipo(index, { descripcion: e.target.value })}
                          disabled={isSubmitting}
                          className={gritInputClass}
                        />
                      </GritField>
                    </div>

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
        </GritCard>

        <GritField htmlFor="plan-beneficio" label="Beneficios" optional hint="Escribe un beneficio y presiona Enter.">
          <div className="flex gap-2">
            <input
              id="plan-beneficio"
              type="text"
              value={beneficioInput}
              onChange={(event) => setBeneficioInput(event.target.value)}
              onKeyDown={handleBeneficioKeyDown}
              disabled={isSubmitting}
              placeholder="Ej: 10 % en eventos"
              aria-describedby={gritDescribedBy('plan-beneficio', true)}
              className={gritInputClass}
            />
            <GritIconButton
              icon="add"
              label="Agregar beneficio"
              onClick={addBeneficio}
              disabled={isSubmitting || !beneficioInput.trim()}
            />
          </div>
          {values.beneficios.length > 0 ? (
            <ul className="mt-1 space-y-1.5">
              {values.beneficios.map((beneficio, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-grit-body text-[13px] text-grit-text"
                >
                  <span className="flex items-center gap-2">
                    <GritIcon name="redeem" size={14} className="text-grit-violet" />
                    {beneficio}
                  </span>
                  <GritIconButton
                    icon="close"
                    label={`Eliminar beneficio: ${beneficio}`}
                    size="sm"
                    variant="ghost"
                    onClick={() => removeBeneficio(index)}
                    disabled={isSubmitting}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </GritField>

        <GritField
          htmlFor="plan-estado"
          label="Estado"
          hint={
            isHidden
              ? 'Los atletas no pueden ver ni adquirir este plan. Solo un administrador puede asignarlo desde Gestión de suscripciones.'
              : undefined
          }
        >
          <select
            id="plan-estado"
            value={estado}
            onChange={(event) => onChangeEstado(event.target.value as PlanEstado)}
            disabled={isSubmitting}
            aria-describedby={gritDescribedBy('plan-estado', isHidden)}
            className={cx('grit-select-chevron', gritSelectClass)}
          >
            {(Object.keys(PLAN_ESTADO_LABELS) as PlanEstado[]).map((key) => (
              <option key={key} value={key}>
                {PLAN_ESTADO_LABELS[key]}
              </option>
            ))}
          </select>
        </GritField>

        <div className="flex flex-col gap-1.5">
          <GritSwitch
            id="plan-public"
            checked={values.es_publico}
            onChange={(next) => onChangeField('es_publico', next)}
            disabled={isSubmitting || !values.visible_atletas}
            label="Plan público"
            showLabel
            aria-describedby="plan-public-help"
          />
          <p id="plan-public-help" className="font-grit-body text-[11px] text-grit-muted">
            {values.visible_atletas
              ? 'Los planes públicos pueden ser vistos y adquiridos por personas que no pertenecen a la organización.'
              : 'Un plan no visible no puede ser público.'}
          </p>
        </div>

        <fieldset disabled={isSubmitting}>
          <legend className={legendClass}>
            Disciplinas <span className="font-normal text-grit-muted">(opcional)</span>
          </legend>
          {activeDisciplines.length === 0 ? (
            <GritAlert tone="warning">No hay disciplinas activas disponibles. Crea disciplinas primero.</GritAlert>
          ) : (
            <div className="grit-scrollbar max-h-48 space-y-1 overflow-y-auto rounded-grit-lg border border-white/[0.10] bg-white/[0.02] p-2">
              {activeDisciplines.map((discipline) => (
                <label
                  key={discipline.id}
                  className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 font-grit-body text-[13px] text-grit-text transition hover:bg-white/[0.04]"
                >
                  <input
                    type="checkbox"
                    checked={values.disciplinaIds.includes(discipline.id)}
                    onChange={() => handleDisciplineToggle(discipline.id)}
                    className="h-4 w-4 shrink-0 accent-grit-cyan"
                  />
                  {discipline.nombre}
                </label>
              ))}
            </div>
          )}
          {fieldErrors.disciplinaIds ? (
            <p className="mt-1.5 font-grit-body text-xs text-grit-danger" role="alert">
              {fieldErrors.disciplinaIds}
            </p>
          ) : null}
        </fieldset>

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
