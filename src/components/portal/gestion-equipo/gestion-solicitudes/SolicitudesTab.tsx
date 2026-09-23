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
  bloquear: (solicitud: SolicitudRow, revisadoPor: string) => Promise<void>;
  refresh: () => Promise<void>;
  currentUserId: string;
};

export function SolicitudesTab({
  solicitudes,
  loading,
  error,
  aceptar,
  rechazar,
  bloquear,
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

  async function handleBloquear(solicitud: SolicitudRow) {
    await bloquear(solicitud, currentUserId);
  }

  if (loading) {
    return (
      <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
        Cargando solicitudes...
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (solicitudes.length === 0) {
    return (
      <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
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
        onBloquear={handleBloquear}
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
