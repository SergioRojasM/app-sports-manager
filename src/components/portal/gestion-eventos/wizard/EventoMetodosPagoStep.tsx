'use client';

import { useMemo, useRef, useState } from 'react';
import { GritIcon } from '@/components/ui';
import { ERROR_KEYS, previewPrecio } from '@/lib/portal/eventos-wizard.utils';
import { formatCop, formatEventoFecha, formatEventoHora, formatEventoPrecio } from '@/lib/portal/eventos.utils';
import { EventoMetodoPagoAgregarModal } from './EventoMetodoPagoAgregarModal';
import { EventoMetodosPagoList } from './EventoMetodosPagoList';
import { WizardSection } from './fields';
import type { EventoWizardState } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import type { EventoWizardOptions } from '@/hooks/portal/gestion-eventos/useEventoWizardOptions';
import type { EventoEntradaDraft, EventoMetodoPagoSnapshot, EventoMetodoPagoTarget } from '@/types/portal/eventos.types';

type EventoMetodosPagoStepProps = {
  wizard: EventoWizardState;
  options: EventoWizardOptions;
  disabled: boolean;
};

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

type MetodoDialog = { target: EventoMetodoPagoTarget; editando: EventoMetodoPagoSnapshot | null };

/** Valid amount of a ticket row, or null while it is empty or not a number. */
function valorEntrada(entrada: EventoEntradaDraft): number | null {
  if (entrada.valor.trim() === '') return null;
  const valor = Number(entrada.valor);
  return Number.isNaN(valor) || valor < 0 ? null : valor;
}

export function EventoMetodosPagoStep({ wizard, options, disabled }: EventoMetodosPagoStepProps) {
  const { draft, errors } = wizard;
  const [dialog, setDialog] = useState<MetodoDialog | null>(null);
  // The control that opened the dialog gets the focus back when it closes
  const triggerRef = useRef<HTMLElement | null>(null);
  const activeIds = useMemo(() => new Set(options.metodosPago.map((metodo) => metodo.id)), [options.metodosPago]);

  const precios = previewPrecio(draft);
  const anyPaid = precios.some((precio) => precio.precio > 0);
  const cuponesCount = draft.entradas.reduce((total, entrada) => total + entrada.cupones.length, 0);
  const metodosEntradasCount = draft.entradas.reduce((total, entrada) => total + entrada.metodosPago.length, 0);
  const formulario = options.formularios.find((plantilla) => plantilla.id === draft.formularioId);
  // Cash is never offered at checkout (US-0121): a paid ticket with only cash cannot be bought online
  const soloEfectivo = draft.entradas.filter((entrada) => {
    const metodos = [...draft.metodosPago, ...entrada.metodosPago];
    return (valorEntrada(entrada) ?? 0) > 0 && metodos.length > 0 && metodos.every((metodo) => metodo.tipo === 'efectivo');
  });

  const openDialog = (target: EventoMetodoPagoTarget, editando: EventoMetodoPagoSnapshot | null) => {
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDialog({ target, editando });
  };

  const closeDialog = () => {
    setDialog(null);
    const trigger = triggerRef.current;
    requestAnimationFrame(() => trigger?.focus());
  };

  // Tenant methods not yet in the dialog's list; a ticket also skips the ones that apply to all tickets
  const disponibles = useMemo(() => {
    if (!dialog) return [];
    const usados = new Set(draft.metodosPago.map((metodo) => metodo.id));
    const { target } = dialog;
    if (target.tipo === 'entrada') {
      const entrada = draft.entradas.find((item) => item.clientKey === target.clientKey);
      for (const metodo of entrada?.metodosPago ?? []) usados.add(metodo.id);
    }
    return options.metodosPago.filter((metodo) => !usados.has(metodo.id));
  }, [dialog, draft.metodosPago, draft.entradas, options.metodosPago]);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-5">
        <WizardSection
          title="Métodos para todas las entradas"
          icon="payments"
          description="Estos métodos se muestran a quienes compren cualquier entrada del evento."
        >
          <EventoMetodosPagoList
            label="Métodos de pago para todas las entradas"
            metodos={draft.metodosPago}
            activeIds={activeIds}
            emptyText="Aún no has agregado métodos de pago para todas las entradas."
            errorKey={ERROR_KEYS.metodosPago}
            error={errors[ERROR_KEYS.metodosPago]}
            disabled={disabled}
            onAdd={() => openDialog({ tipo: 'evento' }, null)}
            onEdit={(metodo) => openDialog({ tipo: 'evento' }, metodo)}
            onRemove={(metodoId) => wizard.removeMetodoPago({ tipo: 'evento' }, metodoId)}
          />
          {!anyPaid && precios.length > 0 && (
            <p className="font-grit-body text-xs text-grit-subtext">
              Todas las entradas son gratuitas: no es obligatorio seleccionar métodos de pago.
            </p>
          )}
        </WizardSection>

        <WizardSection
          title="Métodos para una entrada específica"
          icon="confirmation_number"
          description="Estos métodos solo se muestran a quienes compren la entrada indicada."
        >
          {draft.entradas.length === 0 && (
            <p className="rounded-grit-md border border-dashed border-grit-glass-border p-3 font-grit-body text-sm text-grit-subtext">
              Agrega entradas en el paso anterior para asignarles métodos de pago.
            </p>
          )}

          {draft.entradas.map((entrada) => {
            const target: EventoMetodoPagoTarget = { tipo: 'entrada', clientKey: entrada.clientKey };
            const nombre = entrada.nombre.trim() || 'Entrada sin nombre';
            const valor = valorEntrada(entrada);
            const errorKey = ERROR_KEYS.metodosPagoEntrada(entrada.clientKey);
            return (
              <div key={entrada.clientKey} className="space-y-2 rounded-grit-lg border border-grit-glass-border p-3">
                <h4 className="flex flex-wrap items-baseline gap-2 font-grit-body text-sm font-semibold text-grit-text">
                  {nombre}
                  {valor !== null && (
                    <span className="text-xs font-normal text-grit-subtext">{valor === 0 ? 'Gratis' : formatCop(valor)}</span>
                  )}
                </h4>
                <EventoMetodosPagoList
                  label={`Métodos de pago de la entrada ${nombre}`}
                  metodos={entrada.metodosPago}
                  activeIds={activeIds}
                  emptyText="Sin métodos específicos"
                  errorKey={errorKey}
                  error={errors[errorKey]}
                  disabled={disabled}
                  onAdd={() => openDialog(target, null)}
                  onEdit={(metodo) => openDialog(target, metodo)}
                  onRemove={(metodoId) => wizard.removeMetodoPago(target, metodoId)}
                />
              </div>
            );
          })}
        </WizardSection>

        {soloEfectivo.map((entrada) => (
          <p
            key={entrada.clientKey}
            className="flex items-start gap-1.5 rounded-grit-md border border-amber-400/40 bg-amber-500/15 px-3 py-2 font-grit-body text-xs text-amber-200"
          >
            <GritIcon name="warning" size={14} className="mt-px" />
            Los compradores de «{entrada.nombre.trim() || 'Entrada sin nombre'}» no podrán pagar en línea: el efectivo no se
            ofrece en la compra de entradas.
          </p>
        ))}
      </div>

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
          value={
            draft.metodosPago.length + metodosEntradasCount === 0
              ? 'Ninguno'
              : `${draft.metodosPago.length} para todas las entradas · ${metodosEntradasCount} por entrada`
          }
        />
      </WizardSection>

      {dialog && (
        <EventoMetodoPagoAgregarModal
          tenantId={wizard.tenantId}
          disponibles={disponibles}
          editando={dialog.editando}
          onAdd={(metodo) => wizard.addMetodoPago(dialog.target, metodo)}
          onUpdate={(metodo) => wizard.updateMetodoPago(dialog.target, metodo)}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
