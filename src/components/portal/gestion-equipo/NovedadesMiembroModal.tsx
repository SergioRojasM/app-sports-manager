'use client';

import { useCallback, useEffect, useState } from 'react';
import { MultilineText } from '@/components/ui';
import type { MiembroNovedad, MiembroTableItem } from '@/types/portal/equipo.types';
import { EquipoStatusBadge } from './EquipoStatusBadge';

type NovedadesMiembroModalProps = {
  member: MiembroTableItem | null;
  isOpen: boolean;
  onClose: () => void;
  getNovedades: (miembroId: string) => Promise<MiembroNovedad[]>;
};

const TIPO_LABELS: Record<string, string> = {
  falta_pago: 'Falta de pago',
  inasistencias_acumuladas: 'Inasistencias acumuladas',
  suspension_manual: 'Suspensión manual',
  reactivacion: 'Reactivación',
  otro: 'Otro',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function NovedadesMiembroModal({ member, isOpen, onClose, getNovedades }: NovedadesMiembroModalProps) {
  const [novedades, setNovedades] = useState<MiembroNovedad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNovedades = useCallback(async (miembroId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNovedades(miembroId);
      setNovedades(data);
    } catch {
      setError('No fue posible cargar las novedades.');
    } finally {
      setLoading(false);
    }
  }, [getNovedades]);

  useEffect(() => {
    if (isOpen && member) {
      void fetchNovedades(member.miembro_id);
    } else {
      setNovedades([]);
      setError(null);
    }
  }, [isOpen, member, fetchNovedades]);

  if (!member || !isOpen) return null;

  const fullName = [member.nombre, member.apellido].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-grit-cyan/15">
          <span className="material-symbols-outlined text-2xl text-grit-cyan" aria-hidden="true">history</span>
        </div>

        <h2 className="font-grit-title mb-1 text-center text-lg font-semibold text-grit-text">
          Historial de novedades
        </h2>
        <p className="mb-4 text-center text-sm text-grit-subtext">{fullName}</p>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-grit-md bg-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-grit-2xl border border-grit-danger/25 bg-grit-danger/10 p-4">
              <p className="text-sm text-grit-danger">{error}</p>
            </div>
          ) : novedades.length === 0 ? (
            <p className="py-8 text-center text-sm text-grit-subtext">
              No hay novedades registradas para este miembro.
            </p>
          ) : (
            <div className="space-y-3">
              {novedades.map((n) => (
                <div
                  key={n.id}
                  className="rounded-grit-md border border-grit-glass-border bg-grit-card p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-grit-text">
                      {TIPO_LABELS[n.tipo] ?? n.tipo}
                    </span>
                    <EquipoStatusBadge estado={n.estado_resultante} />
                  </div>
                  {n.descripcion ? (
                    <MultilineText className="mt-1 text-xs text-grit-subtext">{n.descripcion}</MultilineText>
                  ) : (
                    <p className="mt-1 text-xs text-grit-subtext">—</p>
                  )}
                  <p className="mt-1 text-[10px] text-grit-muted">
                    {formatDate(n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Close button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
