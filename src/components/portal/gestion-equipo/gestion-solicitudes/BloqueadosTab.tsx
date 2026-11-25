'use client';

import type { BloqueadoRow } from '@/types/portal/solicitudes.types';
import { BloqueadosTable } from './BloqueadosTable';

type BloqueadosTabProps = {
  bloqueados: BloqueadoRow[];
  loading: boolean;
  error: string | null;
  desbloquear: (usuarioId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export function BloqueadosTab({
  bloqueados,
  loading,
  error,
  desbloquear,
  refresh,
}: BloqueadosTabProps) {
  if (loading) {
    return (
      <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
        Cargando usuarios bloqueados...
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

  if (bloqueados.length === 0) {
    return (
      <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
        No hay usuarios bloqueados.
      </div>
    );
  }

  return (
    <BloqueadosTable
      rows={bloqueados}
      onDesbloquear={(usuarioId) => void desbloquear(usuarioId)}
    />
  );
}
