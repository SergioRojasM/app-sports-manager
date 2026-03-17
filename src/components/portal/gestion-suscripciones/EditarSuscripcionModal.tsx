'use client';

import { useEffect, useRef } from 'react';
import type { SuscripcionAdminRow } from '@/types/portal/gestion-suscripciones.types';
import { useEditarSuscripcion } from '@/hooks/portal/gestion-suscripciones/useEditarSuscripcion';

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'activa', label: 'Activa' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'cancelada', label: 'Cancelada' },
];

type EditarSuscripcionModalProps = {
  row: SuscripcionAdminRow;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditarSuscripcionModal({
  row,
  tenantId,
  onClose,
  onSuccess,
}: EditarSuscripcionModalProps) {
  const { formValues, setField, planes, isLoadingPlanes, isSubmitting, error, submit } =
    useEditarSuscripcion({ row, tenantId, onSuccess });

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isSubmitting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editar Suscripción"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-slate-100">Editar Suscripción</h2>
        <p className="mt-1 text-sm text-slate-400">
          Suscripción de <strong className="text-slate-200">{row.atleta_nombre}</strong>
        </p>

        <div className="mt-4 space-y-4">
          {/* Plan */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Plan</label>
            <select
              value={formValues.plan_id}
              onChange={(e) => setField('plan_id', e.target.value)}
              disabled={isSubmitting || isLoadingPlanes}
              className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
            >
              {isLoadingPlanes ? (
                <option value="">Cargando planes…</option>
              ) : (
                <>
                  <option value="">Seleccionar plan</option>
                  {planes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Estado</label>
            <select
              value={formValues.estado}
              onChange={(e) => setField('estado', e.target.value as typeof formValues.estado)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
            >
              {ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha Inicio</label>
              <input
                type="date"
                value={formValues.fecha_inicio ?? ''}
                onChange={(e) => setField('fecha_inicio', e.target.value || null)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Fecha Fin</label>
              <input
                type="date"
                value={formValues.fecha_fin ?? ''}
                onChange={(e) => setField('fecha_fin', e.target.value || null)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Classes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Clases Restantes
              </label>
              <input
                type="number"
                min={0}
                value={formValues.clases_restantes ?? ''}
                onChange={(e) =>
                  setField(
                    'clases_restantes',
                    e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10)),
                  )
                }
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Clases Plan</label>
              <input
                type="number"
                min={0}
                value={formValues.clases_plan ?? ''}
                onChange={(e) =>
                  setField(
                    'clases_plan',
                    e.target.value === '' ? null : Math.max(0, parseInt(e.target.value, 10)),
                  )
                }
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Comentarios</label>
            <textarea
              value={formValues.comentarios ?? ''}
              onChange={(e) => setField('comentarios', e.target.value || null)}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting || !formValues.plan_id}
            className="rounded-lg border border-turquoise/40 bg-turquoise/10 px-4 py-2 text-sm font-medium text-turquoise transition-colors hover:bg-turquoise/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}
