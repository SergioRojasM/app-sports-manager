'use client';

import { useState } from 'react';
import type { Asistencia, AsistenciaFormValues } from '@/types/portal/asistencias.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AsistenciaFormModalProps = {
  open: boolean;
  reservaId: string;
  atletaNombre: string;
  existing: Asistencia | null;
  onSave: (values: AsistenciaFormValues) => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
  saving: boolean;
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function AsistenciaFormModal({
  open,
  atletaNombre,
  existing,
  onSave,
  onDelete,
  onClose,
  saving,
}: AsistenciaFormModalProps) {
  const [asistio, setAsistio] = useState<boolean>(existing?.asistio ?? true);
  const [observaciones, setObservaciones] = useState(existing?.observaciones ?? '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!open) {
    return null;
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({ asistio, observaciones });
  };

  const handleDeleteClick = () => {
    setConfirmingDelete(true);
  };

  const handleDeleteConfirm = async () => {
    await onDelete();
    setConfirmingDelete(false);
  };

  const handleDeleteCancel = () => {
    setConfirmingDelete(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Verificar asistencia — ${atletaNombre}`}
    >
      <div className="w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-slate-100">
          Verificar Asistencia —{' '}
          <span className="text-turquoise">{atletaNombre}</span>
        </h2>

        {confirmingDelete ? (
          /* ── Delete confirmation step ── */
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              ¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={saving}
                className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Confirmar eliminación'}
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSave} className="space-y-5">
            {/* Asistio toggle */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-300">¿Asistió al entrenamiento?</legend>
              <div className="flex gap-3">
                <label
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    asistio
                      ? 'border-emerald-400/60 bg-emerald-900/30 text-emerald-200'
                      : 'border-portal-border bg-navy-deep text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="asistio"
                    value="true"
                    checked={asistio === true}
                    onChange={() => setAsistio(true)}
                    className="sr-only"
                  />
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    check_circle
                  </span>
                  Asistió
                </label>

                <label
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    !asistio
                      ? 'border-rose-400/60 bg-rose-900/30 text-rose-300'
                      : 'border-portal-border bg-navy-deep text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="asistio"
                    value="false"
                    checked={asistio === false}
                    onChange={() => setAsistio(false)}
                    className="sr-only"
                  />
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    cancel
                  </span>
                  No asistió
                </label>
              </div>
            </fieldset>

            {/* Observaciones */}
            <div>
              <label htmlFor="asistencia-observaciones" className="mb-1 block text-sm font-medium text-slate-300">
                Observaciones <span className="text-slate-500">(opcional)</span>
              </label>
              <textarea
                id="asistencia-observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={saving}
                rows={3}
                maxLength={500}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-turquoise focus:outline-none"
                placeholder="Notas del entrenador sobre esta asistencia..."
              />
              <p className="mt-1 text-right text-[10px] text-slate-500">{observaciones.length}/500</p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                {existing && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={saving}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                  >
                    Eliminar registro
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/40"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep hover:bg-turquoise/90 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
