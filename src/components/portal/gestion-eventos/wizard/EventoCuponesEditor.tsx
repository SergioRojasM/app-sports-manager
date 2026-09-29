'use client';

import { GritButton } from '@/components/ui';
import { CUPON_NOMBRE_MAX, ERROR_KEYS } from '@/lib/portal/eventos-wizard.utils';
import { aplicarDescuento, formatCop } from '@/lib/portal/eventos.utils';
import { FieldError, RowIconButton, fieldA11y, inputClass } from './fields';
import type { EventoCuponDraft, EventoWizardErrors } from '@/types/portal/eventos.types';

type EventoCuponesEditorProps = {
  entradaIndex: number;
  cupones: EventoCuponDraft[];
  /** Parsed ticket value, or null when missing/invalid. */
  valorEntrada: number | null;
  errors: EventoWizardErrors;
  disabled?: boolean;
  onAdd: () => void;
  onUpdate: (cuponKey: string, patch: Partial<Omit<EventoCuponDraft, 'clientKey' | 'id'>>) => void;
  onRemove: (cuponKey: string) => void;
};

function previewDescuento(valor: number | null, descuento: string): string | null {
  const porcentaje = Number(descuento);
  if (valor === null || valor <= 0 || descuento.trim() === '' || Number.isNaN(porcentaje)) return null;
  if (porcentaje <= 0 || porcentaje > 100) return null;
  return `${formatCop(valor)} → ${formatCop(aplicarDescuento(valor, porcentaje))}`;
}

export function EventoCuponesEditor({
  entradaIndex,
  cupones,
  valorEntrada,
  errors,
  disabled,
  onAdd,
  onUpdate,
  onRemove,
}: EventoCuponesEditorProps) {
  const esGratis = valorEntrada === 0;
  const n = entradaIndex + 1;

  return (
    <div className="space-y-3">
      {cupones.length === 0 && (
        <p className="font-grit-body text-xs text-grit-subtext">Esta entrada no tiene cupones de descuento.</p>
      )}

      {cupones.map((cupon, index) => {
        const nombreKey = ERROR_KEYS.cupon(cupon.clientKey, 'nombre');
        const codigoKey = ERROR_KEYS.cupon(cupon.clientKey, 'cupon');
        const descuentoKey = ERROR_KEYS.cupon(cupon.clientKey, 'descuento');
        const ventanaKey = ERROR_KEYS.cupon(cupon.clientKey, 'ventana');
        const preview = previewDescuento(valorEntrada, cupon.descuento);
        const m = index + 1;

        return (
          <div key={cupon.clientKey} className="space-y-2 rounded-grit-md border border-grit-glass-border bg-grit-bg/40 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)_auto]">
              <div>
                <input
                  {...fieldA11y(nombreKey, errors[nombreKey])}
                  type="text"
                  aria-label={`Nombre del cupón ${m} de la entrada ${n}`}
                  maxLength={CUPON_NOMBRE_MAX}
                  value={cupon.nombre}
                  onChange={(event) => onUpdate(cupon.clientKey, { nombre: event.target.value })}
                  disabled={disabled}
                  placeholder="Preventa influencers"
                  className={inputClass(errors[nombreKey])}
                />
                <FieldError errorKey={nombreKey} error={errors[nombreKey]} />
              </div>
              <div>
                <input
                  {...fieldA11y(codigoKey, errors[codigoKey])}
                  type="text"
                  aria-label={`Código del cupón ${m} de la entrada ${n}`}
                  maxLength={30}
                  value={cupon.cupon}
                  onChange={(event) => onUpdate(cupon.clientKey, { cupon: event.target.value })}
                  disabled={disabled}
                  placeholder="PREVENTA20"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className={inputClass(errors[codigoKey], 'font-mono uppercase')}
                />
                <FieldError errorKey={codigoKey} error={errors[codigoKey]} />
              </div>
              <div>
                <div className="relative">
                  <input
                    {...fieldA11y(descuentoKey, errors[descuentoKey])}
                    type="number"
                    aria-label={`Descuento en porcentaje del cupón ${m} de la entrada ${n}`}
                    min={0.01}
                    max={100}
                    step="0.01"
                    inputMode="decimal"
                    value={cupon.descuento}
                    onChange={(event) => onUpdate(cupon.clientKey, { descuento: event.target.value })}
                    disabled={disabled}
                    placeholder="20"
                    className={inputClass(errors[descuentoKey], 'pr-8')}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-grit-body text-sm text-grit-muted">
                    %
                  </span>
                </div>
                <FieldError errorKey={descuentoKey} error={errors[descuentoKey]} />
              </div>
              <RowIconButton
                icon="delete"
                label={`Eliminar cupón ${m} de la entrada ${n}`}
                onClick={() => onRemove(cupon.clientKey)}
                disabled={disabled}
                danger
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                {...fieldA11y(ventanaKey, errors[ventanaKey])}
                type="datetime-local"
                aria-label={`Cupón ${m} de la entrada ${n} válido desde`}
                value={cupon.validoDesde}
                onChange={(event) => onUpdate(cupon.clientKey, { validoDesde: event.target.value })}
                disabled={disabled}
                className={inputClass(errors[ventanaKey])}
              />
              <input
                type="datetime-local"
                aria-label={`Cupón ${m} de la entrada ${n} válido hasta`}
                aria-invalid={errors[ventanaKey] ? true : undefined}
                value={cupon.validoHasta}
                onChange={(event) => onUpdate(cupon.clientKey, { validoHasta: event.target.value })}
                disabled={disabled}
                className={inputClass(errors[ventanaKey])}
              />
            </div>
            <FieldError errorKey={ventanaKey} error={errors[ventanaKey]} />
            {preview && <p className="font-grit-body text-xs font-semibold text-grit-success">{preview}</p>}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <GritButton
          variant="ghost"
          size="sm"
          icon="sell"
          onClick={onAdd}
          disabled={disabled || esGratis}
          aria-describedby={esGratis ? `cupones-gratis-hint-${entradaIndex}` : undefined}
        >
          Añadir cupón
        </GritButton>
        {esGratis && (
          <span id={`cupones-gratis-hint-${entradaIndex}`} className="font-grit-body text-[11px] text-grit-muted">
            Las entradas gratuitas no admiten cupones
          </span>
        )}
      </div>
    </div>
  );
}
