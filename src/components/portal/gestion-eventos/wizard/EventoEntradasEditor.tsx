'use client';

import { useState } from 'react';
import { GritButton, GritIcon, cx } from '@/components/ui';
import { ENTRADA_NOMBRE_MAX, ERROR_KEYS } from '@/lib/portal/eventos-wizard.utils';
import { formatCop } from '@/lib/portal/eventos.utils';
import { EventoDangerButton, EventoModalShell } from '../EventoModalShell';
import { EventoBundleSelector } from './EventoBundleSelector';
import { EventoCuponesEditor } from './EventoCuponesEditor';
import { Field, FieldError, RowIconButton, errorDomId, fieldA11y, fieldDomId, inputClass } from './fields';
import {
  EVENTO_ENTRADA_TIPO_LABELS,
  type EventoEntradaDraft,
  type EventoEntradaTipo,
  type EventoListItem,
} from '@/types/portal/eventos.types';
import type { EventoWizardState } from '@/hooks/portal/gestion-eventos/useEventoWizard';

type EventoEntradasEditorProps = {
  wizard: EventoWizardState;
  eventos: EventoListItem[];
  disabled: boolean;
};

function parseValor(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed;
}

const TIPOS: EventoEntradaTipo[] = ['sencilla', 'multiple'];

export function EventoEntradasEditor({ wizard, eventos, disabled }: EventoEntradasEditorProps) {
  const { draft, errors } = wizard;
  const [pendingDelete, setPendingDelete] = useState<EventoEntradaDraft | null>(null);
  const [collapsedCupones, setCollapsedCupones] = useState<Record<string, boolean>>({});

  const requestDelete = (entrada: EventoEntradaDraft) => {
    if (entrada.cupones.length > 0) setPendingDelete(entrada);
    else wizard.removeEntrada(entrada.clientKey);
  };

  return (
    <div className="space-y-4">
      {draft.entradas.length === 0 && (
        <div
          id={fieldDomId(ERROR_KEYS.entradas)}
          tabIndex={-1}
          className={cx(
            'rounded-grit-md border border-dashed p-6 text-center outline-none',
            errors[ERROR_KEYS.entradas] ? 'border-grit-danger/60' : 'border-grit-glass-border',
          )}
        >
          <GritIcon name="confirmation_number" size={28} className="mx-auto text-grit-muted" />
          <p className="mt-2 font-grit-body text-sm text-grit-subtext">Aún no has creado entradas para este evento.</p>
          <p className="font-grit-body text-xs text-grit-muted">Para un evento gratuito, crea una entrada con valor 0.</p>
          <FieldError errorKey={ERROR_KEYS.entradas} error={errors[ERROR_KEYS.entradas]} />
        </div>
      )}

      {draft.entradas.map((entrada, index) => {
        const n = index + 1;
        const nombreKey = ERROR_KEYS.entrada(entrada.clientKey, 'nombre');
        const valorKey = ERROR_KEYS.entrada(entrada.clientKey, 'valor');
        const bundleKey = ERROR_KEYS.entrada(entrada.clientKey, 'bundle');
        const ventanaKey = ERROR_KEYS.entrada(entrada.clientKey, 'ventana');
        const valor = parseValor(entrada.valor);
        const hasCuponErrors = entrada.cupones.some((cupon) =>
          Object.keys(errors).some((key) => key.startsWith(`cupon.${cupon.clientKey}.`)),
        );
        // Invalid coupons force the panel open so focus requests can reach the field
        const cuponesCollapsed = !hasCuponErrors && (collapsedCupones[entrada.clientKey] ?? entrada.cupones.length === 0);
        const cuponesPanelId = `cupones-panel-${entrada.clientKey}`;

        return (
          <article key={entrada.clientKey} className="space-y-4 rounded-grit-2xl border border-grit-glass-border bg-grit-card p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="flex items-center gap-2 font-grit-title text-base font-semibold text-grit-text">
                <GritIcon name="confirmation_number" size={18} className="text-grit-cyan" />
                Entrada {n}
                {valor !== null && (
                  <span className="font-grit-body text-sm font-normal text-grit-subtext">
                    · {valor === 0 ? 'Gratis' : formatCop(valor)}
                  </span>
                )}
              </h4>
              <div className="flex gap-1.5">
                <RowIconButton
                  icon="arrow_upward"
                  label={`Subir la entrada ${n}`}
                  onClick={() => wizard.moveEntrada(entrada.clientKey, -1)}
                  disabled={disabled || index === 0}
                />
                <RowIconButton
                  icon="arrow_downward"
                  label={`Bajar la entrada ${n}`}
                  onClick={() => wizard.moveEntrada(entrada.clientKey, 1)}
                  disabled={disabled || index === draft.entradas.length - 1}
                />
                <RowIconButton
                  icon="delete"
                  label={`Eliminar la entrada ${n}`}
                  onClick={() => requestDelete(entrada)}
                  disabled={disabled}
                  danger
                />
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Field errorKey={nombreKey} label={`Nombre de la entrada ${n}`} required error={errors[nombreKey]}>
                <input
                  {...fieldA11y(nombreKey, errors[nombreKey])}
                  type="text"
                  maxLength={ENTRADA_NOMBRE_MAX}
                  value={entrada.nombre}
                  onChange={(event) => wizard.updateEntrada(entrada.clientKey, { nombre: event.target.value })}
                  disabled={disabled}
                  placeholder="General"
                  className={inputClass(errors[nombreKey])}
                />
              </Field>
              <Field
                errorKey={valorKey}
                label={`Valor de la entrada ${n} (COP)`}
                required
                error={errors[valorKey]}
                hint="0 = gratis."
                hintId={`${fieldDomId(valorKey)}-hint`}
              >
                <input
                  {...fieldA11y(valorKey, errors[valorKey], `${fieldDomId(valorKey)}-hint`)}
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={entrada.valor}
                  onChange={(event) => wizard.updateEntrada(entrada.clientKey, { valor: event.target.value })}
                  disabled={disabled}
                  placeholder="50000"
                  className={inputClass(errors[valorKey])}
                />
              </Field>
            </div>

            <fieldset>
              <legend className="mb-1.5 font-grit-body text-xs font-semibold text-grit-subtext">Tipo de la entrada {n}</legend>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((tipo) => (
                  <label
                    key={tipo}
                    className={cx(
                      'flex cursor-pointer items-center gap-2 rounded-grit-md border px-3 py-2 font-grit-body text-sm transition focus-within:ring-2 focus-within:ring-grit-cyan',
                      entrada.tipoEntrada === tipo
                        ? 'border-grit-cyan/60 bg-grit-cyan/10 text-grit-text'
                        : 'border-grit-glass-border text-grit-subtext',
                    )}
                  >
                    <input
                      type="radio"
                      name={`tipo-entrada-${entrada.clientKey}`}
                      value={tipo}
                      checked={entrada.tipoEntrada === tipo}
                      onChange={() => wizard.updateEntrada(entrada.clientKey, { tipoEntrada: tipo })}
                      disabled={disabled}
                      className="h-4 w-4 accent-grit-cyan"
                    />
                    {EVENTO_ENTRADA_TIPO_LABELS[tipo]}
                  </label>
                ))}
              </div>
            </fieldset>

            {entrada.tipoEntrada === 'multiple' && (
              <EventoBundleSelector
                errorKey={bundleKey}
                entradaIndex={index}
                eventoActualId={wizard.eventoId}
                formularioActualId={wizard.draft.formularioId}
                eventos={eventos}
                value={entrada.eventosIdBundle}
                error={errors[bundleKey]}
                droppedCount={wizard.bundleWarnings[entrada.clientKey]}
                disabled={disabled}
                onChange={(ids) => wizard.updateEntrada(entrada.clientKey, { eventosIdBundle: ids })}
              />
            )}

            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={fieldDomId(ventanaKey)}
                    className="mb-1 block font-grit-body text-xs font-semibold text-grit-subtext"
                  >
                    Venta disponible desde
                  </label>
                  <input
                    {...fieldA11y(ventanaKey, errors[ventanaKey])}
                    type="datetime-local"
                    value={entrada.validaDesde}
                    onChange={(event) => wizard.updateEntrada(entrada.clientKey, { validaDesde: event.target.value })}
                    disabled={disabled}
                    className={inputClass(errors[ventanaKey])}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${fieldDomId(ventanaKey)}-hasta`}
                    className="mb-1 block font-grit-body text-xs font-semibold text-grit-subtext"
                  >
                    Venta disponible hasta
                  </label>
                  <input
                    id={`${fieldDomId(ventanaKey)}-hasta`}
                    type="datetime-local"
                    aria-invalid={errors[ventanaKey] ? true : undefined}
                    aria-describedby={errors[ventanaKey] ? errorDomId(ventanaKey) : undefined}
                    value={entrada.validaHasta}
                    onChange={(event) => wizard.updateEntrada(entrada.clientKey, { validaHasta: event.target.value })}
                    disabled={disabled}
                    className={inputClass(errors[ventanaKey])}
                  />
                </div>
              </div>
              <FieldError errorKey={ventanaKey} error={errors[ventanaKey]} />
            </div>

            <div className="rounded-grit-md border border-grit-glass-border">
              <button
                type="button"
                onClick={() => setCollapsedCupones((current) => ({ ...current, [entrada.clientKey]: !cuponesCollapsed }))}
                aria-expanded={!cuponesCollapsed}
                aria-controls={cuponesPanelId}
                className="flex w-full items-center justify-between px-3 py-2 font-grit-body text-sm font-semibold text-grit-text"
              >
                <span className="flex items-center gap-2">
                  <GritIcon name="sell" size={16} className="text-grit-cyan" />
                  Cupones de descuento ({entrada.cupones.length})
                </span>
                <GritIcon name={cuponesCollapsed ? 'expand_more' : 'expand_less'} size={18} />
              </button>
              {!cuponesCollapsed && (
                <div id={cuponesPanelId} className="border-t border-grit-glass-border p-3">
                  <EventoCuponesEditor
                    entradaIndex={index}
                    cupones={entrada.cupones}
                    valorEntrada={valor}
                    errors={errors}
                    disabled={disabled}
                    onAdd={() => wizard.addCupon(entrada.clientKey)}
                    onUpdate={(cuponKey, patch) => wizard.updateCupon(entrada.clientKey, cuponKey, patch)}
                    onRemove={(cuponKey) => wizard.removeCupon(entrada.clientKey, cuponKey)}
                  />
                </div>
              )}
            </div>
          </article>
        );
      })}

      <GritButton variant="secondary" size="sm" icon="add" onClick={wizard.addEntrada} disabled={disabled}>
        Añadir entrada
      </GritButton>

      {pendingDelete && (
        <EventoModalShell
          title="Eliminar entrada"
          onClose={() => setPendingDelete(null)}
          footer={
            <>
              <GritButton variant="secondary" size="sm" onClick={() => setPendingDelete(null)}>
                Cancelar
              </GritButton>
              <EventoDangerButton
                onClick={() => {
                  wizard.removeEntrada(pendingDelete.clientKey);
                  setPendingDelete(null);
                }}
                loading={false}
                loadingLabel=""
              >
                Eliminar entrada
              </EventoDangerButton>
            </>
          }
        >
          <p>
            Se eliminarán también {pendingDelete.cupones.length === 1 ? '1 cupón' : `${pendingDelete.cupones.length} cupones`} de
            &quot;{pendingDelete.nombre.trim() || 'esta entrada'}&quot;.
          </p>
        </EventoModalShell>
      )}
    </div>
  );
}
