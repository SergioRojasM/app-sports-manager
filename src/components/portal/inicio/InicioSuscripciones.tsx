'use client';

import { useState } from 'react';
import type { InicioSuscripcion } from '@/types/portal/inicio.types';

type FilterKey = 'todas' | 'activa' | 'pendiente';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'activa', label: 'Activas' },
  { key: 'pendiente', label: 'Pendientes' },
];

function statusBadge(estado: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    activa: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Activa' },
    pendiente: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pendiente' },
    vencida: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Vencida' },
    cancelada: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Cancelada' },
  };
  const badge = map[estado] ?? { bg: 'bg-slate-500/20', text: 'text-slate-400', label: estado };
  return (
    <span className={`${badge.bg} ${badge.text} text-[10px] font-bold px-2 py-0.5 rounded-md`}>
      {badge.label}
    </span>
  );
}

function paymentBadge(pagoEstado: string | null) {
  if (!pagoEstado) return null;
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pendiente: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Pago pendiente' },
    aprobado: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Pago aprobado' },
    rechazado: { bg: 'bg-rose-500/20', text: 'text-rose-400', label: 'Pago rechazado' },
  };
  const badge = map[pagoEstado] ?? {
    bg: 'bg-slate-500/20',
    text: 'text-slate-400',
    label: pagoEstado,
  };
  return (
    <span className={`${badge.bg} ${badge.text} text-[10px] font-bold px-2 py-0.5 rounded-md`}>
      {badge.label}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function InicioSuscripciones({
  suscripciones,
}: {
  suscripciones: InicioSuscripcion[];
}) {
  const [filter, setFilter] = useState<FilterKey>('todas');

  const filtered =
    filter === 'todas'
      ? suscripciones
      : suscripciones.filter((s) => s.estado === filter);

  return (
    <div className="glass-card rounded-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold">Mis Suscripciones</h4>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
              filter === f.key
                ? 'bg-secondary/20 text-secondary'
                : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
            }`}
            aria-label={`Filtrar suscripciones: ${f.label}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
            card_membership
          </span>
          <p className="text-slate-400 text-sm">No tienes suscripciones activas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-md bg-slate-800/20 border border-transparent hover:border-primary/20 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-secondary truncate">
                  {s.plan_nombre}
                </p>
                {statusBadge(s.estado)}
              </div>
              <p className="text-xs text-slate-500 mb-2">{s.org_nombre}</p>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {formatDate(s.fecha_inicio)} — {formatDate(s.fecha_fin)}
                </span>
                {paymentBadge(s.pago_estado)}
              </div>

              {/* Progress indicator for classes remaining */}
              {s.clases_plan !== null && s.clases_plan > 0 && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>Clases restantes</span>
                    <span>
                      {s.clases_restantes ?? 0} / {s.clases_plan}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary to-primary rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          ((s.clases_restantes ?? 0) / s.clases_plan) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
