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
  const { formValues, setField, setServicioUnidades, planes, isLoadingPlanes, isSubmitting, error, submit } =
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Editar Suscripción"
        tabIndex={-1}
        className="border bg-grit-glass backdrop-blur-md mx-4 w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">Editar Suscripción</h2>
        <p className="mt-1 text-sm text-grit-subtext">
          Suscripción de <strong className="text-grit-text">{row.atleta_nombre}</strong>
        </p>

        <div className="mt-4 space-y-4">
          {/* Plan */}
          <div>
            <label className="mb-1 block text-xs font-medium text-grit-subtext">Plan</label>
            <select
              value={formValues.plan_id}
              onChange={(e) => setField('plan_id', e.target.value)}
              disabled={isSubmitting || isLoadingPlanes}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
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
            <label className="mb-1 block text-xs font-medium text-grit-subtext">Estado</label>
            <select
              value={formValues.estado}
              onChange={(e) => setField('estado', e.target.value as typeof formValues.estado)}
              disabled={isSubmitting}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
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
              <label className="mb-1 block text-xs font-medium text-grit-subtext">Fecha Inicio</label>
              <input
                type="date"
                value={formValues.fecha_inicio ?? ''}
                onChange={(e) => setField('fecha_inicio', e.target.value || null)}
                disabled={isSubmitting}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-grit-subtext">Fecha Fin</label>
              <input
                type="date"
                value={formValues.fecha_fin ?? ''}
                onChange={(e) => setField('fecha_fin', e.target.value || null)}
                disabled={isSubmitting}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Comentarios */}
          <div>
            <label className="mb-1 block text-xs font-medium text-grit-subtext">Comentarios</label>
            <textarea
              value={formValues.comentarios ?? ''}
              onChange={(e) => setField('comentarios', e.target.value || null)}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50 focus:ring-1 focus:ring-grit-cyan/30 disabled:opacity-50"
            />
          </div>

          {/* Unidades por Servicio */}
          {formValues.servicios.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-grit-subtext">Unidades por Servicio</p>
              <div className="space-y-2">
                {formValues.servicios.map((srv) => {
                  const isIlimitado = srv.unidades_restantes === null;
                  const checkboxId = `ilimitado-${srv.servicio_id}`;
                  return (
                    <div
                      key={srv.servicio_id}
                      className="flex items-center gap-3 rounded-grit-md border border-grit-glass-border bg-white/[0.02] px-3 py-2"
                    >
                      {/* Service name */}
                      <span className="min-w-0 flex-1 truncate text-xs text-grit-text">
                        {srv.servicio_nombre}
                      </span>
                      {/* Included units badge */}
                      <span className="shrink-0 text-xs text-grit-muted">
                        / {srv.unidades_incluidas ?? '∞'}
                      </span>
                      {/* Ilimitado checkbox */}
                      <label
                        htmlFor={checkboxId}
                        className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-grit-subtext"
                        aria-label={`Ilimitado para ${srv.servicio_nombre}`}
                      >
                        <input
                          id={checkboxId}
                          type="checkbox"
                          checked={isIlimitado}
                          disabled={isSubmitting}
                          onChange={(e) =>
                            setServicioUnidades(
                              srv.servicio_id,
                              e.target.checked ? null : (srv.unidades_incluidas ?? 0),
                            )
                          }
                          className="accent-grit-cyan"
                        />
                        ∞
                      </label>
                      {/* Remaining units input */}
                      {!isIlimitado && (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={srv.unidades_restantes ?? 0}
                          disabled={isSubmitting}
                          aria-label={`Unidades restantes para ${srv.servicio_nombre}`}
                          onChange={(e) => {
                            const parsed = parseInt(e.target.value, 10);
                            setServicioUnidades(
                              srv.servicio_id,
                              Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
                            );
                          }}
                          className="w-16 rounded border border-grit-glass-border bg-grit-bg px-2 py-1 text-xs text-grit-text outline-none focus:border-grit-cyan/50 disabled:opacity-50"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-medium text-grit-subtext transition-colors hover:bg-white/[0.04] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={isSubmitting || !formValues.plan_id}
            className="rounded-grit-md border border-grit-cyan/40 bg-grit-cyan/10 px-4 py-2 text-sm font-medium text-grit-cyan transition-colors hover:bg-grit-cyan/20 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

