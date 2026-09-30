'use client';

import { useMemo } from 'react';
import { GritButton, GritIcon, cx } from '@/components/ui';
import { ERROR_KEYS, previewPrecio } from '@/lib/portal/eventos-wizard.utils';
import { formatEventoFecha, formatEventoHora, formatEventoPrecio } from '@/lib/portal/eventos.utils';
import { FieldError, WizardSection, errorDomId, fieldDomId } from './fields';
import type { EventoWizardState } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import type { EventoWizardOptions } from '@/hooks/portal/gestion-eventos/useEventoWizardOptions';
import type { EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';
import { METODO_PAGO_TIPO_LABELS, type MetodoPago } from '@/types/portal/metodos-pago.types';

type EventoMetodosPagoStepProps = {
  wizard: EventoWizardState;
  options: EventoWizardOptions;
  disabled: boolean;
};

function toSnapshot(metodo: MetodoPago): EventoMetodoPagoSnapshot {
  return {
    id: metodo.id,
    nombre: metodo.nombre,
    tipo: metodo.tipo,
    valor: metodo.valor,
    url: metodo.url,
    comentarios: metodo.comentarios,
  };
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <GritIcon name={icon} size={18} className="mt-0.5 text-grit-cyan" />
      <div className="min-w-0">
        <p className="font-grit-body text-[11px] uppercase tracking-wide text-grit-muted">{label}</p>
        <p className="truncate font-grit-body text-sm text-grit-text">{value}</p>
      </div>
    </div>
  );
}

export function EventoMetodosPagoStep({ wizard, options, disabled }: EventoMetodosPagoStepProps) {
  const { draft, errors } = wizard;
  const selectedIds = useMemo(() => new Set(draft.metodosPago.map((metodo) => metodo.id)), [draft.metodosPago]);
  const activeIds = useMemo(() => new Set(options.metodosPago.map((metodo) => metodo.id)), [options.metodosPago]);
  // Stored snapshots of methods that are no longer active stay listed (checked) until the admin removes them
  const stale = draft.metodosPago.filter((metodo) => !activeIds.has(metodo.id));

  const precios = previewPrecio(draft);
  const anyPaid = precios.some((precio) => precio.precio > 0);
  const cuponesCount = draft.entradas.reduce((total, entrada) => total + entrada.cupones.length, 0);
  const formulario = options.formularios.find((plantilla) => plantilla.id === draft.formularioId);
  const error = errors[ERROR_KEYS.metodosPago];

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <WizardSection
        title="Métodos de pago del evento"
        icon="payments"
        description="Elige cuáles de los métodos de pago de tu organización se aceptan para este evento. Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento."
        action={
          options.metodosPago.length > 0 ? (
            <div className="flex gap-2">
              <GritButton
                variant="ghost"
                size="sm"
                onClick={() => wizard.setMetodosPago([...stale, ...options.metodosPago.map(toSnapshot)])}
                disabled={disabled}
              >
                Seleccionar todos
              </GritButton>
              <GritButton variant="ghost" size="sm" onClick={() => wizard.setMetodosPago([])} disabled={disabled}>
                Quitar todos
              </GritButton>
            </div>
          ) : undefined
        }
      >
        <fieldset
          id={fieldDomId(ERROR_KEYS.metodosPago)}
          tabIndex={-1}
          aria-describedby={error ? errorDomId(ERROR_KEYS.metodosPago) : undefined}
          className="space-y-2 outline-none"
        >
          <legend className="sr-only">Métodos de pago</legend>

          {options.metodosPago.length === 0 && stale.length === 0 && (
            <div className="rounded-grit-md border border-dashed border-grit-glass-border p-4 font-grit-body text-sm text-grit-subtext">
              <p>Tu organización no tiene métodos de pago activos.</p>
              <GritButton
                variant="ghost"
                size="sm"
                icon="open_in_new"
                href={`/portal/orgs/${wizard.tenantId}/gestion-organizacion`}
                className="mt-2"
              >
                Configurar métodos de pago
              </GritButton>
            </div>
          )}

          {stale.map((metodo) => (
            <label
              key={metodo.id}
              className="flex cursor-pointer items-start gap-3 rounded-grit-md border border-grit-discipline-run/50 bg-grit-card p-3"
            >
              <input
                type="checkbox"
                checked
                onChange={() => wizard.toggleMetodoPago(metodo)}
                disabled={disabled}
                className="mt-1 h-4 w-4 accent-grit-cyan"
              />
              <span className="min-w-0">
                <span className="block font-grit-body text-sm font-semibold text-grit-text">
                  {metodo.nombre} <span className="font-normal text-grit-discipline-run">(inactivo o eliminado)</span>
                </span>
                <span className="block font-grit-body text-xs text-grit-subtext">
                  Ya no está activo en tu organización. Si lo quitas, no podrás volver a seleccionarlo.
                </span>
              </span>
            </label>
          ))}

          {options.metodosPago.map((metodo) => {
            const checked = selectedIds.has(metodo.id);
            return (
              <label
                key={metodo.id}
                className={cx(
                  'flex cursor-pointer items-start gap-3 rounded-grit-md border p-3 transition focus-within:ring-2 focus-within:ring-grit-cyan',
                  checked ? 'border-grit-cyan/60 bg-grit-cyan/10' : 'border-grit-glass-border bg-grit-card',
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => wizard.toggleMetodoPago(toSnapshot(metodo))}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 accent-grit-cyan"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-grit-body text-sm font-semibold text-grit-text">{metodo.nombre}</span>
                    <span className="rounded-full border border-grit-glass-border px-2 py-0.5 font-grit-body text-[10px] font-semibold uppercase text-grit-subtext">
                      {METODO_PAGO_TIPO_LABELS[metodo.tipo]}
                    </span>
                  </span>
                  {metodo.valor && <span className="block truncate font-grit-body text-xs text-grit-subtext">{metodo.valor}</span>}
                  {metodo.url && <span className="block truncate font-grit-body text-xs text-grit-cyan">{metodo.url}</span>}
                  {metodo.comentarios && (
                    <span className="block font-grit-body text-xs text-grit-muted">{metodo.comentarios}</span>
                  )}
                </span>
              </label>
            );
          })}
        </fieldset>
        <FieldError errorKey={ERROR_KEYS.metodosPago} error={error} />
        {!anyPaid && precios.length > 0 && (
          <p className="font-grit-body text-xs text-grit-subtext">
            Todas las entradas son gratuitas: no es obligatorio seleccionar métodos de pago.
          </p>
        )}
      </WizardSection>

      <WizardSection title="Resumen" icon="fact_check">
        <SummaryRow icon="event" label="Evento" value={draft.nombre.trim() || 'Sin nombre'} />
        <SummaryRow
          icon="calendar_month"
          label="Fecha"
          value={
            draft.fechaHora
              ? `${formatEventoFecha(`${draft.fechaHora}:00-05:00`)} · ${formatEventoHora(`${draft.fechaHora}:00-05:00`)}`
              : 'Fecha por definir'
          }
        />
        <SummaryRow
          icon="confirmation_number"
          label="Entradas"
          value={
            draft.entradas.length === 0
              ? 'Sin entradas'
              : `${draft.entradas.length} ${draft.entradas.length === 1 ? 'entrada' : 'entradas'}${
                  precios.length > 0 ? ` · ${formatEventoPrecio(precios)}` : ''
                }`
          }
        />
        <SummaryRow icon="sell" label="Cupones" value={cuponesCount === 0 ? 'Sin cupones' : String(cuponesCount)} />
        <SummaryRow icon="assignment" label="Formulario" value={formulario?.nombre ?? (draft.formularioId ? 'Formulario inactivo' : 'Sin formulario')} />
        <SummaryRow
          icon="payments"
          label="Métodos de pago"
          value={draft.metodosPago.length === 0 ? 'Ninguno' : String(draft.metodosPago.length)}
        />
      </WizardSection>
    </div>
  );
}
