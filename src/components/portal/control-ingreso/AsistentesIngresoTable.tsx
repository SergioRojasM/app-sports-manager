'use client';

import { GritButton, GritIcon, cx, gritInputClass, gritSelectClass } from '@/components/ui';
import { ASISTENTES_INGRESO_PAGE_SIZE, type useAsistentesIngreso } from '@/hooks/portal/control-ingreso/useAsistentesIngreso';
import { formatIngresoHora } from '@/lib/portal/eventos-ingreso.utils';
import type { AsistenteIngreso, AsistentesIngresoFiltro } from '@/types/portal/eventos-compras.types';

type AsistentesIngresoTableProps = {
  lista: ReturnType<typeof useAsistentesIngreso>;
  /** Ticket whose row action is running. */
  pendingTicketId: string | null;
  onRegistrar: (asistente: AsistenteIngreso) => void;
  onRevertir: (asistente: AsistenteIngreso) => void;
};

const FILTROS: Array<{ value: AsistentesIngresoFiltro; label: string }> = [
  { value: 'todos', label: 'Todos' },
  { value: 'ingresaron', label: 'Ingresaron' },
  { value: 'pendientes', label: 'Pendientes de ingreso' },
];

function EstadoIngreso({ ingresoAt }: { ingresoAt: string | null }) {
  return ingresoAt ? (
    <span className="inline-flex items-center gap-1 rounded-grit-sm border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
      <GritIcon name="check_circle" size={12} />
      Ingresó {formatIngresoHora(ingresoAt)}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-grit-sm border border-grit-glass-border px-1.5 py-0.5 text-[11px] font-semibold text-grit-subtext">
      <GritIcon name="schedule" size={12} />
      Sin ingreso
    </span>
  );
}

/** `activa` tickets of the event with register / revert per row (US-0131). Stacked below `md`. */
export function AsistentesIngresoTable({ lista, pendingTicketId, onRegistrar, onRevertir }: AsistentesIngresoTableProps) {
  const total = lista.filtrados.length;
  const start = total === 0 ? 0 : (lista.currentPage - 1) * ASISTENTES_INGRESO_PAGE_SIZE + 1;
  const end = Math.min(lista.currentPage * ASISTENTES_INGRESO_PAGE_SIZE, total);

  const accion = (asistente: AsistenteIngreso) => {
    const busy = pendingTicketId === asistente.ticketId;
    return asistente.ingresoAt ? (
      <button
        type="button"
        disabled={busy}
        onClick={() => onRevertir(asistente)}
        aria-label={`Revertir ingreso de ${asistente.asistenteNombre}`}
        className="inline-flex items-center gap-1 rounded-grit-sm border border-grit-danger/40 px-2 py-1 font-grit-body text-[11px] font-semibold text-grit-danger transition hover:bg-grit-danger/10 disabled:opacity-50"
      >
        <GritIcon name="undo" size={13} />
        Revertir
      </button>
    ) : (
      <button
        type="button"
        disabled={busy}
        onClick={() => onRegistrar(asistente)}
        aria-label={`Registrar ingreso de ${asistente.asistenteNombre}`}
        className="inline-flex items-center gap-1 rounded-grit-sm border border-emerald-400/40 px-2 py-1 font-grit-body text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
      >
        <GritIcon name="login" size={13} />
        {busy ? 'Registrando…' : 'Registrar ingreso'}
      </button>
    );
  };

  let contenido;
  if (lista.loading) {
    contenido = <p className="font-grit-body text-sm text-grit-subtext">Cargando asistentes…</p>;
  } else if (lista.error) {
    contenido = (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="font-grit-body text-sm text-grit-danger">
          {lista.error}
        </p>
        <GritButton variant="secondary" size="sm" icon="refresh" onClick={lista.recargar}>
          Reintentar
        </GritButton>
      </div>
    );
  } else if (lista.asistentes.length === 0) {
    contenido = (
      <p className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-4 font-grit-body text-sm text-grit-subtext">
        Este evento aún no tiene entradas activas.
      </p>
    );
  } else if (total === 0) {
    contenido = (
      <p className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-4 font-grit-body text-sm text-grit-subtext">
        Ningún asistente coincide con los filtros.
      </p>
    );
  } else {
    contenido = (
      <>
        <div className="hidden overflow-x-auto rounded-grit-md border border-grit-glass-border md:block">
          <table className="w-full text-left font-grit-body text-sm">
            <thead className="border-b border-grit-glass-border bg-grit-glass text-xs uppercase tracking-wider text-grit-subtext">
              <tr>
                <th scope="col" className="px-4 py-3">Asistente</th>
                <th scope="col" className="px-4 py-3">Entrada</th>
                <th scope="col" className="px-4 py-3">Código</th>
                <th scope="col" className="px-4 py-3">Ingreso</th>
                <th scope="col" className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grit-glass-border">
              {lista.paginados.map((asistente) => (
                <tr key={asistente.ticketId} className="align-top transition-colors hover:bg-white/[0.02]">
                  <td className="max-w-[240px] px-4 py-3">
                    <div className="truncate font-semibold text-grit-text">{asistente.asistenteNombre}</div>
                    <div className="truncate text-xs text-grit-subtext">{asistente.asistenteEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-grit-text">{asistente.entradaNombre}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-grit-subtext">{asistente.codigo}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <EstadoIngreso ingresoAt={asistente.ingresoAt} />
                  </td>
                  <td className="px-4 py-3 text-right">{accion(asistente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="space-y-3 md:hidden">
          {lista.paginados.map((asistente) => (
            <li
              key={asistente.ticketId}
              className="flex flex-col gap-2 rounded-grit-md border border-grit-glass-border bg-grit-glass p-4 font-grit-body text-sm"
            >
              <div className="min-w-0">
                <div className="truncate font-semibold text-grit-text">{asistente.asistenteNombre}</div>
                <div className="truncate text-xs text-grit-subtext">{asistente.asistenteEmail}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-grit-subtext">
                <span>{asistente.entradaNombre}</span>
                <span className="font-mono">{asistente.codigo}</span>
                <EstadoIngreso ingresoAt={asistente.ingresoAt} />
              </div>
              <div className="flex justify-end">{accion(asistente)}</div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-grit-body text-xs text-grit-subtext">
            Mostrando {start}–{end} de {total} asistentes
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={lista.currentPage <= 1}
              onClick={() => lista.setCurrentPage(lista.currentPage - 1)}
              className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="px-2 py-1 text-xs text-grit-subtext">
              {lista.currentPage} / {lista.totalPages}
            </span>
            <button
              type="button"
              disabled={lista.currentPage >= lista.totalPages}
              onClick={() => lista.setCurrentPage(lista.currentPage + 1)}
              className="rounded-grit-xs border border-grit-glass-border px-2.5 py-1 text-xs text-grit-subtext transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <section aria-labelledby="asistentes-ingreso-titulo" className="flex flex-col gap-4">
      <h2 id="asistentes-ingreso-titulo" className="font-grit-title text-lg font-semibold text-grit-text">
        Asistentes
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">
          Buscar
          <input
            type="search"
            value={lista.search}
            onChange={(event) => lista.setSearch(event.target.value)}
            placeholder="Nombre, correo o código"
            className={gritInputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext sm:w-56">
          Ingreso
          <select
            value={lista.filtro}
            onChange={(event) => lista.setFiltro(event.target.value as AsistentesIngresoFiltro)}
            className={gritSelectClass}
          >
            {FILTROS.map((filtro) => (
              <option key={filtro.value} value={filtro.value}>
                {filtro.label}
              </option>
            ))}
          </select>
        </label>
        {lista.hayFiltros && (
          <GritButton variant="ghost" size="sm" onClick={lista.limpiarFiltros}>
            Limpiar filtros
          </GritButton>
        )}
      </div>
      <div className={cx('space-y-4')}>{contenido}</div>
    </section>
  );
}
