'use client';

import { GritButton, GritIcon, cx } from '@/components/ui';
import { ingresoResultadoMeta, type IngresoTone } from '@/lib/portal/eventos-ingreso.utils';
import type { IngresoResultado } from '@/types/portal/eventos-compras.types';

type IngresoResultadoCardProps = {
  resultado: IngresoResultado | null;
  pending: boolean;
  onDeshacer: (ticketId: string) => void;
  onSiguiente: () => void;
};

const TONE_CLASSES: Record<IngresoTone, string> = {
  success: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200',
  warning: 'border-amber-400/50 bg-amber-500/15 text-amber-200',
  danger: 'border-grit-danger/50 bg-grit-danger/15 text-grit-danger',
};

/**
 * Result of the last read (US-0131): icon + text + color, never color alone. The live region is
 * always mounted so screen readers announce every new result.
 */
export function IngresoResultadoCard({ resultado, pending, onDeshacer, onSiguiente }: IngresoResultadoCardProps) {
  const meta = resultado ? ingresoResultadoMeta(resultado) : null;

  return (
    <div role="status" aria-live="assertive" aria-atomic="true">
      {pending && !resultado && (
        <p className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-5 text-center font-grit-body text-sm text-grit-subtext">
          Validando…
        </p>
      )}
      {resultado && meta && (
        <div className={cx('flex flex-col gap-4 rounded-grit-2xl border p-5 font-grit-body', TONE_CLASSES[meta.tone])}>
          <div className="flex items-start gap-3">
            <GritIcon name={meta.icon} size={40} className="shrink-0" />
            <div className="min-w-0">
              <p className="font-grit-title text-xl font-bold leading-tight">{meta.titulo}</p>
              {meta.detalle && <p className="mt-1 text-sm">{meta.detalle}</p>}
            </div>
          </div>

          {resultado.asistenteNombre && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm text-grit-text">
              <dt className="text-grit-subtext">Asistente</dt>
              <dd className="truncate font-semibold">{resultado.asistenteNombre}</dd>
              {resultado.entradaNombre && (
                <>
                  <dt className="text-grit-subtext">Entrada</dt>
                  <dd className="truncate">{resultado.entradaNombre}</dd>
                </>
              )}
              {resultado.codigo && (
                <>
                  <dt className="text-grit-subtext">Código</dt>
                  <dd className="font-mono">{resultado.codigo}</dd>
                </>
              )}
            </dl>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            {meta.permiteDeshacer && resultado.ticketId && (
              <GritButton
                variant="secondary"
                size="sm"
                icon="undo"
                disabled={pending}
                onClick={() => onDeshacer(resultado.ticketId as string)}
              >
                Deshacer ingreso
              </GritButton>
            )}
            <GritButton size="sm" icon="arrow_forward" iconPosition="end" disabled={pending} onClick={onSiguiente}>
              Siguiente
            </GritButton>
          </div>
        </div>
      )}
    </div>
  );
}
