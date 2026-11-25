'use client';

import {
  GritAvatar,
  GritButton,
  GritCard,
  GritIcon,
  GritPagination,
  GritPillSelect,
  GritSearchField,
  GritSegmented,
  cx,
} from '@/components/ui';
import { ASISTENTES_INGRESO_PAGE_SIZE, type useAsistentesIngreso } from '@/hooks/portal/control-ingreso/useAsistentesIngreso';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import type { AsistenteIngreso, AsistentesIngresoFiltro, AsistentesIngresoOrden } from '@/types/portal/eventos-compras.types';

type AsistentesIngresoTableProps = {
  lista: ReturnType<typeof useAsistentesIngreso>;
  /** Ticket whose row action is running. */
  pendingTicketId: string | null;
  onRegistrar: (asistente: AsistenteIngreso) => void;
  onRevertir: (asistente: AsistenteIngreso) => void;
};

/** Column widths of `xjlmU` `OE3Ow`: attendee · code · entry · action. */
const ROW_GRID = 'md:grid md:grid-cols-[minmax(0,1fr)_120px_110px_130px] md:items-center md:gap-3';

function EstadoIngreso({ ingresoAt }: { ingresoAt: string | null }) {
  return ingresoAt ? (
    <span className="inline-flex items-center gap-1.5 font-grit-body text-[11px] font-medium text-grit-cyan">
      <GritIcon name="check_circle" size={13} />
      {formatHoraCorta(ingresoAt)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 font-grit-body text-[11px] font-medium text-grit-muted">
      <GritIcon name="pending" size={13} />
      Pendiente
    </span>
  );
}

/**
 * Attendee panel of the check-in screen (US-0131, grit-arena-v3 `xjlmU` `PMix6`): segmented filter with
 * counts, search, order, rows with register / undo, 50 per page (scrolls inside the panel from lg).
 */
export function AsistentesIngresoTable({ lista, pendingTicketId, onRegistrar, onRevertir }: AsistentesIngresoTableProps) {
  const total = lista.filtrados.length;
  const start = total === 0 ? 0 : (lista.currentPage - 1) * ASISTENTES_INGRESO_PAGE_SIZE + 1;
  const end = Math.min(lista.currentPage * ASISTENTES_INGRESO_PAGE_SIZE, total);
  const summary = `${start}–${end} de ${total} asistentes`;

  const accion = (asistente: AsistenteIngreso) => {
    const busy = pendingTicketId === asistente.ticketId;
    return asistente.ingresoAt ? (
      <GritButton
        variant="ghost"
        size="sm"
        icon="undo"
        disabled={busy}
        onClick={() => onRevertir(asistente)}
        aria-label={`Deshacer ingreso de ${asistente.asistenteNombre}`}
      >
        Deshacer
      </GritButton>
    ) : (
      <GritButton
        variant="outline-accent"
        size="sm"
        icon="login"
        disabled={busy}
        onClick={() => onRegistrar(asistente)}
        aria-label={`Registrar ingreso de ${asistente.asistenteNombre}`}
      >
        {busy ? 'Registrando…' : 'Registrar'}
      </GritButton>
    );
  };

  let contenido;
  if (lista.loading) {
    contenido = (
      <div className="flex flex-col gap-1" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse rounded-grit-lg bg-white/[0.03]" />
        ))}
      </div>
    );
  } else if (lista.error) {
    contenido = (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="font-grit-body text-[13px] text-grit-danger">
          {lista.error}
        </p>
        <GritButton variant="secondary" size="sm" icon="refresh" onClick={lista.recargar}>
          Reintentar
        </GritButton>
      </div>
    );
  } else if (lista.asistentes.length === 0) {
    contenido = <p className="font-grit-body text-[13px] text-grit-muted">Este evento aún no tiene entradas activas.</p>;
  } else if (total === 0) {
    contenido = (
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-grit-body text-[13px] text-grit-muted">Ningún asistente coincide con los filtros.</p>
        <GritButton variant="secondary" size="sm" onClick={lista.limpiarFiltros}>
          Limpiar filtros
        </GritButton>
      </div>
    );
  } else {
    contenido = (
      <>
        <div
          aria-hidden="true"
          className={cx(
            ROW_GRID,
            'hidden rounded-grit-lg bg-white/[0.025] px-3.5 py-2 font-grit-body text-[9px] font-semibold tracking-[1.4px] text-grit-muted',
          )}
        >
          <span>ASISTENTE</span>
          <span>CÓDIGO</span>
          <span>INGRESO</span>
          <span />
        </div>

        <div className="relative">
          <ul className="flex flex-col gap-1 lg:max-h-[393px] lg:overflow-y-auto lg:pr-1.5 grit-scrollbar">
            {lista.paginados.map((asistente) => {
              const ingreso = asistente.ingresoAt !== null;
              return (
                <li
                  key={asistente.ticketId}
                  className={cx(
                    ROW_GRID,
                    'flex flex-col gap-2 rounded-grit-lg border px-3.5 py-[7px]',
                    ingreso ? 'border-grit-cyan/15 bg-grit-cyan/[0.04]' : 'border-white/[0.04] bg-white/[0.016]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <GritAvatar name={asistente.asistenteNombre} size={32} tone={ingreso ? 'soft' : 'neutral'} />
                    <div className="min-w-0">
                      <p className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{asistente.asistenteNombre}</p>
                      {asistente.entradaNombre && (
                        <p className="truncate font-grit-body text-[11px] text-grit-muted">{asistente.entradaNombre}</p>
                      )}
                    </div>
                  </div>
                  <span className="font-grit-mono text-[11px] font-semibold tracking-[0.6px] text-grit-subtext">{asistente.codigo}</span>
                  <EstadoIngreso ingresoAt={asistente.ingresoAt} />
                  <div className="flex md:justify-end">{accion(asistente)}</div>
                </li>
              );
            })}
          </ul>
        </div>

        {lista.totalPages > 1 ? (
          <GritPagination
            page={lista.currentPage}
            totalPages={lista.totalPages}
            onPageChange={lista.setCurrentPage}
            summary={summary}
          />
        ) : (
          <p className="px-1 font-grit-body text-[11px] text-grit-muted">{summary}</p>
        )}
      </>
    );
  }

  const opciones: Array<{ value: AsistentesIngresoFiltro; label: string; count: number }> = [
    { value: 'todos', label: 'Todos', count: lista.conteos.todos },
    { value: 'ingresaron', label: 'Ingresaron', count: lista.conteos.ingresaron },
    { value: 'pendientes', label: 'Pendientes', count: lista.conteos.pendientes },
  ];

  return (
    <GritCard variant="card" padding="none" as="section" className="flex min-w-0 flex-col gap-3.5 px-4 py-[18px] sm:px-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="asistentes-ingreso-titulo" className="flex items-center gap-2 font-grit-body text-[15px] font-semibold text-grit-text">
          Asistentes
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold text-grit-subtext">
            {lista.conteos.todos}
          </span>
        </h2>
        <GritSegmented options={opciones} value={lista.filtro} onChange={lista.setFiltro} ariaLabel="Filtrar por ingreso" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <GritSearchField
          aria-label="Buscar asistente por nombre, correo o código"
          placeholder="Nombre, correo o código"
          value={lista.search}
          onChange={(event) => lista.setSearch(event.target.value)}
          className="flex-1"
        />
        <GritPillSelect
          label="Ordenar asistentes"
          icon="swap_vert"
          value={lista.orden}
          onChange={(value) => lista.setOrden(value as AsistentesIngresoOrden)}
        >
          <option value="pendientes">Pendientes primero</option>
          <option value="nombre">Nombre A–Z</option>
          <option value="recientes">Ingreso más reciente</option>
        </GritPillSelect>
      </div>

      {contenido}
    </GritCard>
  );
}
