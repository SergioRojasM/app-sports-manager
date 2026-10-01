'use client';

import { GritIcon, cx } from '@/components/ui';
import { EventoCompraEstadoBadge } from '@/components/portal/eventos/compra';
import { formatCop, formatDescuento } from '@/lib/portal/eventos.utils';
import type { CompraAdminItem } from '@/types/portal/eventos-compras.types';

type EventoComprasTableProps = {
  compras: CompraAdminItem[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalFiltered: number;
  onPageChange: (page: number) => void;
  onVerComprobante: (compra: CompraAdminItem) => void;
  onVerDatos: (compra: CompraAdminItem) => void;
  onValidar: (compra: CompraAdminItem) => void;
  onRechazar: (compra: CompraAdminItem) => void;
  /** Purchase whose proof link is being generated. */
  abriendoComprobanteId: string | null;
};

const COLUMNS = ['Comprador', 'Entrada', 'Total', 'Método', 'Estado', 'Fecha'];

function formatFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

function ActionButton({
  icon,
  label,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'success' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center gap-1 rounded-grit-sm border px-2 py-1 font-grit-body text-[11px] font-semibold transition disabled:opacity-50',
        tone === 'success' && 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/10',
        tone === 'danger' && 'border-grit-danger/40 text-grit-danger hover:bg-grit-danger/10',
        tone === 'default' && 'border-grit-glass-border text-grit-subtext hover:border-grit-cyan/60 hover:text-grit-cyan',
      )}
    >
      <GritIcon name={icon} size={13} />
      {label}
    </button>
  );
}

/** Purchases of one event, stacked below `md`, 20 per page (US-0121). */
export function EventoComprasTable({
  compras,
  currentPage,
  totalPages,
  pageSize,
  totalFiltered,
  onPageChange,
  onVerComprobante,
  onVerDatos,
  onValidar,
  onRechazar,
  abriendoComprobanteId,
}: EventoComprasTableProps) {
  const start = totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalFiltered);

  const renderActions = (compra: CompraAdminItem) => (
    <div className="flex flex-wrap justify-end gap-1.5">
      {compra.comprobantePath && (
        <ActionButton
          icon="receipt"
          label={abriendoComprobanteId === compra.id ? 'Abriendo…' : 'Ver comprobante'}
          onClick={() => onVerComprobante(compra)}
          disabled={abriendoComprobanteId === compra.id}
        />
      )}
      <ActionButton icon="badge" label="Ver datos" onClick={() => onVerDatos(compra)} />
      {compra.estado === 'en_validacion' && (
        <>
          <ActionButton icon="check" label="Validar pago" tone="success" onClick={() => onValidar(compra)} />
          <ActionButton icon="close" label="Rechazar" tone="danger" onClick={() => onRechazar(compra)} />
        </>
      )}
    </div>
  );

  const comprador = (compra: CompraAdminItem) => (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="truncate font-semibold text-grit-text">{compra.compradorNombre}</span>
        <span
          className={cx(
            'rounded-grit-sm border px-1.5 py-0.5 text-[10px] font-bold uppercase',
            compra.registrado ? 'border-grit-cyan/40 text-grit-cyan' : 'border-grit-glass-border text-grit-subtext',
          )}
        >
          {compra.registrado ? 'Registrado' : 'Invitado'}
        </span>
      </div>
      <div className="truncate text-xs text-grit-subtext">{compra.compradorEmail}</div>
    </div>
  );

  const entrada = (compra: CompraAdminItem) => (
    <span className="text-grit-text">
      {compra.entradaNombre}
      {compra.entradaTipo === 'multiple' && (
        <span className="ml-1.5 rounded-grit-sm border border-grit-cyan/40 bg-grit-cyan/[0.13] px-1.5 py-0.5 text-[10px] font-bold uppercase text-grit-cyan">
          Múltiple
        </span>
      )}
    </span>
  );

  const total = (compra: CompraAdminItem) => (
    <div>
      <div className="font-semibold text-grit-text">{compra.total === 0 ? 'Gratis' : formatCop(compra.total)}</div>
      {compra.cuponCodigo && (
        <div className="text-[11px] text-emerald-300">
          {compra.cuponCodigo}
          {compra.descuentoPct !== null ? ` (−${formatDescuento(compra.descuentoPct)})` : ''}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* md and up: table */}
      <div className="hidden overflow-x-auto rounded-grit-md border border-grit-glass-border md:block">
        <table className="w-full text-left font-grit-body text-sm">
          <thead className="border-b border-grit-glass-border bg-grit-glass text-xs uppercase tracking-wider text-grit-subtext">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-4 py-3">
                  {column}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grit-glass-border">
            {compras.map((compra) => (
              <tr key={compra.id} className="align-top transition-colors hover:bg-white/[0.02]">
                <td className="max-w-[240px] px-4 py-3">{comprador(compra)}</td>
                <td className="px-4 py-3">{entrada(compra)}</td>
                <td className="whitespace-nowrap px-4 py-3">{total(compra)}</td>
                <td className="max-w-[140px] truncate px-4 py-3 text-grit-subtext">{compra.metodoPago?.nombre ?? '—'}</td>
                <td className="px-4 py-3">
                  <EventoCompraEstadoBadge estado={compra.estado} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-grit-subtext">{formatFecha(compra.createdAt)}</td>
                <td className="px-4 py-3">{renderActions(compra)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* below md: stacked rows */}
      <ul className="space-y-3 md:hidden">
        {compras.map((compra) => (
          <li key={compra.id} className="space-y-3 rounded-grit-md border border-grit-glass-border bg-grit-glass p-4 font-grit-body text-sm">
            <div className="flex items-start justify-between gap-2">
              {comprador(compra)}
              <EventoCompraEstadoBadge estado={compra.estado} />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <dt className="text-grit-muted">Entrada</dt>
              <dd>{entrada(compra)}</dd>
              <dt className="text-grit-muted">Total</dt>
              <dd>{total(compra)}</dd>
              <dt className="text-grit-muted">Método</dt>
              <dd className="text-grit-subtext">{compra.metodoPago?.nombre ?? '—'}</dd>
              <dt className="text-grit-muted">Fecha</dt>
              <dd className="text-grit-subtext">{formatFecha(compra.createdAt)}</dd>
            </dl>
            {renderActions(compra)}
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="font-grit-body text-xs text-grit-subtext">
          Mostrando {start}–{end} de {totalFiltered} compras
        </p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-2 py-1 text-xs text-grit-subtext">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
