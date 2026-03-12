'use client';

import { useState } from 'react';
import type { SolicitudRow } from '@/types/portal/solicitudes.types';
import { SolicitudesTable } from './SolicitudesTable';
import { AceptarSolicitudModal } from './AceptarSolicitudModal';

type SolicitudesTabProps = {
  solicitudes: SolicitudRow[];
  loading: boolean;
  error: string | null;
  aceptar: (solicitud: SolicitudRow, rolId: string, revisadoPor: string) => Promise<void>;
  rechazar: (solicitud: SolicitudRow, revisadoPor: string, notaRevision?: string) => Promise<void>;
  refresh: () => Promise<void>;
  currentUserId: string;
};

export function SolicitudesTab({
  solicitudes,
  loading,
  error,
  aceptar,
  rechazar,
  refresh,
  currentUserId,
}: SolicitudesTabProps) {
  const [aceptarTarget, setAceptarTarget] = useState<SolicitudRow | null>(null);

  async function handleConfirmAceptar(solicitud: SolicitudRow, rolId: string) {
    await aceptar(solicitud, rolId, currentUserId);
    setAceptarTarget(null);
  }

  async function handleRechazar(solicitud: SolicitudRow, notaRevision?: string) {
    await rechazar(solicitud, currentUserId, notaRevision);
  }

  if (loading) {
    return (
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
        Cargando solicitudes...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
        <p className="text-sm text-rose-200">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
          onClick={() => void refresh()}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
        No hay solicitudes pendientes.
      </div>
    );
  }

  return (
    <>
      <SolicitudesTable
        rows={solicitudes}
        onAceptar={(s) => setAceptarTarget(s)}
        onRechazar={handleRechazar}
      />

      {aceptarTarget ? (
        <AceptarSolicitudModal
          open
          solicitud={aceptarTarget}
          onConfirm={handleConfirmAceptar}
          onClose={() => setAceptarTarget(null)}
        />
      ) : null}
    </>
  );
}
