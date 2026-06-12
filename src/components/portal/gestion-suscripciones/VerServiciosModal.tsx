'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';

type VerServiciosModalProps = {
  row: SuscripcionAdminRow;
  onClose: () => void;
};

export function VerServiciosModal({ row, onClose }: VerServiciosModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  /* ── Dismiss on Escape ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Sort: finite-unit entries first ── */
  const sortedServicios = [...row.servicios].sort((a, b) => {
    const aFinite = a.unidades_incluidas !== null ? 0 : 1;
    const bFinite = b.unidades_incluidas !== null ? 0 : 1;
    return aFinite - bFinite;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Servicios de la suscripción"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-md rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Servicios</h2>
        <p className="mt-1 text-sm text-slate-400">
          {row.atleta_nombre} — <span className="text-slate-300">{row.plan_nombre}</span>
        </p>

        <div className="mt-4">
          {sortedServicios.length === 0 ? (
            <p className="text-sm text-slate-400">Sin servicios registrados.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-portal-border text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 pr-4">Servicio</th>
                  <th className="pb-2 pr-4 text-right">Restantes</th>
                  <th className="pb-2 text-right">Incluidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-portal-border">
                {sortedServicios.map((srv) => (
                  <tr key={srv.servicio_id} className="py-1">
                    <td className="py-2 pr-4 text-slate-200">{srv.servicio_nombre}</td>
                    <td className="py-2 pr-4 text-right text-slate-300">
                      {srv.unidades_restantes ?? '∞'}
                    </td>
                    <td className="py-2 text-right text-slate-400">
                      {srv.unidades_incluidas ?? '∞'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.04]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
