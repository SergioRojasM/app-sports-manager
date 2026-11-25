import { cx } from '@/components/ui';
import { EVENTO_COMPRA_ESTADO_LABELS, type EventoCompraEstado } from '@/types/portal/eventos-compras.types';

const TONE_CLASSES: Record<EventoCompraEstado, string> = {
  pendiente_pago: 'border-grit-glass-border bg-grit-card text-grit-subtext',
  en_validacion: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  confirmada: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300',
  rechazada: 'border-grit-danger/40 bg-rose-500/15 text-grit-danger',
  cancelada: 'border-grit-glass-border bg-grit-card text-grit-muted',
  expirada: 'border-grit-glass-border bg-grit-card text-grit-muted',
};

/** Purchase estado as a text pill (never color only). */
export function EventoCompraEstadoBadge({ estado, className }: { estado: EventoCompraEstado; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center whitespace-nowrap rounded-grit-sm border px-2.5 py-1 font-grit-body text-[11px] font-bold uppercase leading-none tracking-[0.5px]',
        TONE_CLASSES[estado],
        className,
      )}
    >
      {EVENTO_COMPRA_ESTADO_LABELS[estado]}
    </span>
  );
}
