'use client';

import { GritButton, GritIcon, cx } from '@/components/ui';
import { FieldError, errorDomId, fieldDomId } from './fields';
import type { EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';
import { METODO_PAGO_TIPO_LABELS } from '@/types/portal/metodos-pago.types';

type EventoMetodosPagoListProps = {
  /** Accessible name of the group, e.g. "Métodos de pago de la entrada General". */
  label: string;
  metodos: EventoMetodoPagoSnapshot[];
  /** Ids of the tenant's active methods: other tenant snapshots are flagged as stale. */
  activeIds: Set<string>;
  emptyText: string;
  errorKey: string;
  error?: string;
  disabled: boolean;
  onAdd: () => void;
  onEdit: (metodo: EventoMetodoPagoSnapshot) => void;
  onRemove: (metodoId: string) => void;
};

const TAG_CLASS =
  'inline-flex items-center gap-1 rounded-full border border-grit-glass-border px-2 py-0.5 font-grit-body text-[10px] font-semibold uppercase text-grit-subtext';

/** Payment methods of the event or of one ticket, with the "Agregar método de pago" action (US-0130). */
export function EventoMetodosPagoList({
  label,
  metodos,
  activeIds,
  emptyText,
  errorKey,
  error,
  disabled,
  onAdd,
  onEdit,
  onRemove,
}: EventoMetodosPagoListProps) {
  return (
    <div
      id={fieldDomId(errorKey)}
      role="group"
      aria-label={label}
      aria-describedby={error ? errorDomId(errorKey) : undefined}
      tabIndex={-1}
      className="space-y-2 outline-none"
    >
      {metodos.length === 0 ? (
        <p className="rounded-grit-md border border-dashed border-grit-glass-border p-3 font-grit-body text-sm text-grit-subtext">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {metodos.map((metodo) => {
            const soloEvento = metodo.origen === 'evento';
            const stale = !soloEvento && !activeIds.has(metodo.id);
            return (
              <li
                key={metodo.id}
                className={cx(
                  'flex items-start gap-3 rounded-grit-md border bg-grit-card p-3',
                  stale ? 'border-grit-discipline-run/50' : 'border-grit-glass-border',
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-grit-body text-sm font-semibold text-grit-text">{metodo.nombre}</span>
                    {stale && (
                      <span className="font-grit-body text-sm text-grit-discipline-run">(inactivo o eliminado)</span>
                    )}
                    <span className={TAG_CLASS}>{METODO_PAGO_TIPO_LABELS[metodo.tipo] ?? metodo.tipo}</span>
                    {soloEvento && <span className={cx(TAG_CLASS, 'border-grit-cyan/50 text-grit-cyan')}>Solo este evento</span>}
                    {metodo.tipo === 'efectivo' && (
                      <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 font-grit-body text-[10px] font-semibold text-amber-200">
                        No disponible para compra en línea
                      </span>
                    )}
                    {metodo.qr_url && (
                      <span title="Tiene imagen QR" className={TAG_CLASS}>
                        <GritIcon name="qr_code_2" size={12} />
                        QR
                      </span>
                    )}
                  </div>
                  {metodo.valor && <p className="truncate font-grit-body text-xs text-grit-subtext">{metodo.valor}</p>}
                  {metodo.url && <p className="truncate font-grit-body text-xs text-grit-cyan">{metodo.url}</p>}
                  {metodo.comentarios && <p className="font-grit-body text-xs text-grit-muted">{metodo.comentarios}</p>}
                  {stale && (
                    <p className="font-grit-body text-xs text-grit-subtext">
                      Ya no está activo en tu organización. Si lo quitas, no podrás volver a agregarlo.
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  {soloEvento && (
                    <GritButton
                      variant="ghost"
                      size="sm"
                      icon="edit"
                      onClick={() => onEdit(metodo)}
                      disabled={disabled}
                      aria-label={`Editar ${metodo.nombre}`}
                    >
                      Editar
                    </GritButton>
                  )}
                  <GritButton
                    variant="ghost"
                    size="sm"
                    icon="delete"
                    onClick={() => onRemove(metodo.id)}
                    disabled={disabled}
                    aria-label={`Quitar ${metodo.nombre}`}
                  >
                    Quitar
                  </GritButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FieldError errorKey={errorKey} error={error} />

      <GritButton variant="secondary" size="sm" icon="add" onClick={onAdd} disabled={disabled}>
        Agregar método de pago
      </GritButton>
    </div>
  );
}
