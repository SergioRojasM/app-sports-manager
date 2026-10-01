import { GritIcon, cx } from '@/components/ui';
import type { EventoCompraPaso } from '@/hooks/portal/eventos/useEventoCompra';

const PASO_LABELS: Record<EventoCompraPaso, string> = {
  entrada: 'Entrada',
  datos: 'Datos',
  pago: 'Pago',
  confirmacion: 'Listo',
};

type EventoCompraStepperProps = {
  /** Visible steps, in order ("Pago" is left out when the total is 0). */
  pasos: EventoCompraPaso[];
  actual: EventoCompraPaso;
};

/** "Entrada › Datos › Pago › Listo" (US-0121). */
export function EventoCompraStepper({ pasos, actual }: EventoCompraStepperProps) {
  const actualIndex = pasos.indexOf(actual);

  return (
    <nav aria-label="Pasos de la compra">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
        {pasos.map((paso, index) => {
          const completado = index < actualIndex;
          const esActual = index === actualIndex;
          return (
            <li key={paso} className="flex items-center gap-1.5">
              <span
                aria-current={esActual ? 'step' : undefined}
                className={cx(
                  'flex items-center gap-1.5 rounded-grit-sm px-2 py-1 font-grit-body text-xs font-semibold',
                  esActual && 'bg-grit-cyan/[0.13] text-grit-cyan',
                  completado && 'text-grit-text',
                  !esActual && !completado && 'text-grit-muted',
                )}
              >
                <span
                  className={cx(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold',
                    esActual && 'border border-grit-cyan',
                    completado && 'bg-grit-cyan text-grit-bg',
                    !esActual && !completado && 'border border-grit-glass-border',
                  )}
                >
                  {completado ? <GritIcon name="check" size={12} /> : index + 1}
                </span>
                {/* Below `sm` only the current step shows its label, so the stepper stays on one line */}
                <span className={cx(!esActual && 'sr-only sm:not-sr-only')}>{PASO_LABELS[paso]}</span>
              </span>
              {index < pasos.length - 1 && (
                <GritIcon name="chevron_right" size={14} className="text-grit-muted" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
