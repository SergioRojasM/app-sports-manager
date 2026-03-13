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
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
        Cargando usuarios bloqueados...
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

  if (bloqueados.length === 0) {
    return (
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
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
