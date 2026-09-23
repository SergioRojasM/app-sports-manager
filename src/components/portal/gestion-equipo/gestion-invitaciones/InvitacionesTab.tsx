'use client';

import { useState } from 'react';
import type { InvitacionesFiltro, InvitacionRow } from '@/types/portal/invitaciones.types';
import { InvitacionesServiceError } from '@/types/portal/invitaciones.types';
import { InvitacionesTable } from './InvitacionesTable';

type InvitacionesTabProps = {
  invitaciones: InvitacionRow[];
  loading: boolean;
  error: string | null;
  filtro: InvitacionesFiltro;
  onFiltroChange: (filtro: InvitacionesFiltro) => void;
  reenviar: (invitacion: InvitacionRow) => Promise<void>;
  cancelar: (invitacion: InvitacionRow) => Promise<void>;
  refresh: () => Promise<void>;
  onAgregarMiembro: () => void;
};

const FILTRO_OPTIONS: { value: InvitacionesFiltro; label: string }[] = [
  { value: 'activas', label: 'Pendientes' },
  { value: 'aceptada', label: 'Aceptadas' },
  { value: 'expirada', label: 'Expiradas' },
  { value: 'cancelada', label: 'Canceladas' },
  { value: 'fallida', label: 'Fallidas' },
  { value: 'todas', label: 'Todas' },
];

export function InvitacionesTab({
  invitaciones,
  loading,
  error,
  filtro,
  onFiltroChange,
  reenviar,
  cancelar,
  refresh,
  onAgregarMiembro,
}: InvitacionesTabProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  async function runAction(invitacion: InvitacionRow, action: (inv: InvitacionRow) => Promise<void>, okText: string) {
    setBusyId(invitacion.id);
    setActionMessage(null);
    try {
      await action(invitacion);
      setActionMessage({ tone: 'ok', text: okText });
    } catch (err) {
      setActionMessage({
        tone: 'error',
        text: err instanceof InvitacionesServiceError ? err.message : 'No fue posible completar la acción.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="invitaciones-filtro" className="text-xs font-semibold uppercase tracking-wider text-grit-subtext">
            Estado
          </label>
          <select
            id="invitaciones-filtro"
            value={filtro}
            onChange={(e) => onFiltroChange(e.target.value as InvitacionesFiltro)}
            className="rounded-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text focus:border-grit-cyan focus:outline-none"
          >
            {FILTRO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onAgregarMiembro}
          className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
          Agregar miembro
        </button>
      </div>

      {actionMessage ? (
        <div
          role="status"
          className={
            actionMessage.tone === 'ok'
              ? 'rounded-grit-md border border-emerald-400/25 bg-emerald-900/20 p-3 text-sm text-emerald-200'
              : 'rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3 text-sm text-grit-danger'
          }
        >
          {actionMessage.text}
        </div>
      ) : null}

      {loading ? (
        <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">Cargando invitaciones...</div>
      ) : error ? (
        <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
          <p className="text-sm text-grit-danger">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
            onClick={() => void refresh()}
          >
            Reintentar
          </button>
        </div>
      ) : invitaciones.length === 0 ? (
        <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">No hay invitaciones.</div>
      ) : (
        <InvitacionesTable
          rows={invitaciones}
          busyId={busyId}
          onReenviar={(inv) => void runAction(inv, reenviar, 'Invitación reenviada.')}
          onCancelar={(inv) => void runAction(inv, cancelar, 'Invitación cancelada.')}
        />
      )}
    </div>
  );
}
