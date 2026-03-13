'use client';

import { useState } from 'react';
import type { SolicitudRow } from '@/types/portal/solicitudes.types';
import { SolicitudEstadoBadge } from './SolicitudEstadoBadge';

type SolicitudesTableProps = {
  rows: SolicitudRow[];
  onAceptar: (solicitud: SolicitudRow) => void;
  onRechazar: (solicitud: SolicitudRow, notaRevision?: string) => void;
  onBloquear: (solicitud: SolicitudRow) => void;
};

function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function SolicitudesTable({ rows, onAceptar, onRechazar, onBloquear }: SolicitudesTableProps) {
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [notaRevision, setNotaRevision] = useState('');

  function handleConfirmRechazar(solicitud: SolicitudRow) {
    onRechazar(solicitud, notaRevision.trim() || undefined);
    setRechazandoId(null);
    setNotaRevision('');
  }

  function handleCancelRechazar() {
    setRechazandoId(null);
    setNotaRevision('');
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-portal-border">
      <table className="w-full text-left text-sm">
        <thead className="glass border-b border-portal-border text-xs uppercase tracking-wider text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3">Solicitante</th>
            <th scope="col" className="px-4 py-3">Correo</th>
            <th scope="col" className="px-4 py-3">Fecha</th>
            <th scope="col" className="px-4 py-3">Estado</th>
            <th scope="col" className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-portal-border">
          {rows.map((solicitud) => (
            <tr key={solicitud.id} className="text-slate-200 hover:bg-navy-soft/40">
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-portal-border bg-navy-soft">
                    {solicitud.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={solicitud.foto_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-sm text-slate-400" aria-hidden="true">
                        person
                      </span>
                    )}
                  </div>
                  <span className="font-medium">
                    {solicitud.nombre} {solicitud.apellido}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">{solicitud.email}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-300">{formatDate(solicitud.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <SolicitudEstadoBadge estado={solicitud.estado} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right">
                {rechazandoId === solicitud.id ? (
                  <div className="flex flex-col items-end gap-2">
                    <input
                      type="text"
                      value={notaRevision}
                      onChange={(e) => setNotaRevision(e.target.value)}
                      placeholder="Nota de rechazo (opcional)"
                      className="w-60 rounded-md border border-portal-border bg-navy-deep px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-primary focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmRechazar(solicitud)}
                        className="rounded-md border border-rose-400/30 bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRechazar}
                        className="rounded-md border border-portal-border px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-navy-soft"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onAceptar(solicitud)}
                      className="rounded-md border border-emerald-400/30 bg-emerald-900/30 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/50"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRechazandoId(solicitud.id)}
                      className="rounded-md border border-rose-400/30 bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/50"
                    >
                      Rechazar
                    </button>
                    {(solicitud.estado === 'pendiente' || solicitud.estado === 'rechazada') ? (
                      <button
                        type="button"
                        onClick={() => onBloquear(solicitud)}
                        className="rounded-md border border-violet-400/30 bg-violet-900/30 px-2.5 py-1 text-xs font-semibold text-violet-200 hover:bg-violet-900/50"
                      >
                        Bloquear
                      </button>
                    ) : null}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
