'use client';

import { useState } from 'react';
import type { InvitacionRow } from '@/types/portal/invitaciones.types';
import { InvitacionEstadoBadge } from './InvitacionEstadoBadge';

const ROL_DISPLAY_LABELS: Record<string, string> = {
  usuario: 'Atleta',
  administrador: 'Administrador',
  entrenador: 'Entrenador',
};

const ACTIONABLE_STATES = new Set(['pendiente', 'enviada', 'expirada']);

type InvitacionesTableProps = {
  rows: InvitacionRow[];
  busyId: string | null;
  onReenviar: (invitacion: InvitacionRow) => void;
  onCancelar: (invitacion: InvitacionRow) => void;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
}

export function InvitacionesTable({ rows, busyId, onReenviar, onCancelar }: InvitacionesTableProps) {
  const [cancelandoId, setCancelandoId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-grit-md border border-grit-glass-border">
      <table className="w-full text-left text-sm">
        <thead className="border bg-grit-glass backdrop-blur-md border-b border-grit-glass-border text-xs uppercase tracking-wider text-grit-subtext">
          <tr>
            <th scope="col" className="px-4 py-3">Correo</th>
            <th scope="col" className="px-4 py-3">Rol</th>
            <th scope="col" className="px-4 py-3">Estado</th>
            <th scope="col" className="px-4 py-3">Expira</th>
            <th scope="col" className="px-4 py-3">Creada</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grit-glass-border">
          {rows.map((invitacion) => {
            const isBusy = busyId === invitacion.id;
            const canAct = ACTIONABLE_STATES.has(invitacion.estado);

            return (
              <tr key={invitacion.id} className="text-grit-text hover:bg-grit-cyan/10">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{invitacion.email}</span>
                    {invitacion.nombre ? <span className="text-xs text-grit-subtext">{invitacion.nombre}</span> : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-grit-subtext">
                  {ROL_DISPLAY_LABELS[invitacion.rol_nombre.toLowerCase()] ?? invitacion.rol_nombre}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <InvitacionEstadoBadge estado={invitacion.estado} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-grit-subtext">{formatDate(invitacion.expires_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-grit-subtext">{formatDate(invitacion.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {!canAct ? (
                    <span className="text-xs text-grit-muted">—</span>
                  ) : cancelandoId === invitacion.id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          onCancelar(invitacion);
                          setCancelandoId(null);
                        }}
                        className="rounded-md border border-grit-danger/30 bg-grit-danger/10 px-2.5 py-1 text-xs font-semibold text-grit-danger hover:bg-grit-danger/10 disabled:opacity-50"
                      >
                        Confirmar cancelación
                      </button>
                      <button
                        type="button"
                        onClick={() => setCancelandoId(null)}
                        className="rounded-md border border-grit-glass-border px-2.5 py-1 text-xs font-semibold text-grit-subtext hover:bg-grit-cyan/10"
                      >
                        Volver
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onReenviar(invitacion)}
                        className="rounded-md border border-grit-glass-border px-2.5 py-1 text-xs font-semibold text-grit-text hover:bg-grit-cyan/10 disabled:opacity-50"
                      >
                        {isBusy ? 'Enviando…' : 'Reenviar'}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setCancelandoId(invitacion.id)}
                        className="rounded-md border border-grit-danger/30 bg-grit-danger/10 px-2.5 py-1 text-xs font-semibold text-grit-danger hover:bg-grit-danger/10 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
