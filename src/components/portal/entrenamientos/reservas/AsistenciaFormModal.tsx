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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Verificar asistencia — ${atletaNombre}`}
    >
      <div className="w-full max-w-md rounded-grit-lg border border-grit-glass-border bg-grit-card p-6 shadow-2xl">
        <h2 className="font-grit-title mb-5 text-lg font-semibold text-grit-text">
          Verificar Asistencia —{' '}
          <span className="text-grit-cyan">{atletaNombre}</span>
        </h2>

        {confirmingDelete ? (
          /* ── Delete confirmation step ── */
          <div className="space-y-4">
            <p className="text-sm text-grit-subtext">
              ¿Estás seguro de que deseas eliminar este registro de asistencia? Esta acción no se puede
              deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={saving}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-medium text-grit-subtext hover:bg-grit-cyan/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={saving}
                className="rounded-grit-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
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
              <legend className="mb-2 text-sm font-medium text-grit-subtext">¿Asistió al entrenamiento?</legend>
              <div className="flex gap-3">
                <label
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-grit-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                    asistio
                      ? 'border-emerald-400/60 bg-emerald-900/30 text-emerald-200'
                      : 'border-grit-glass-border bg-grit-bg text-grit-subtext hover:border-grit-glass-border'
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
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-grit-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                    !asistio
                      ? 'border-grit-danger/60 bg-grit-danger/10 text-grit-danger'
                      : 'border-grit-glass-border bg-grit-bg text-grit-subtext hover:border-grit-glass-border'
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
              <label htmlFor="asistencia-observaciones" className="mb-1 block text-sm font-medium text-grit-subtext">
                Observaciones <span className="text-grit-muted">(opcional)</span>
              </label>
              <textarea
                id="asistencia-observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={saving}
                rows={3}
                maxLength={500}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted focus:border-grit-cyan focus:outline-none"
                placeholder="Notas del entrenador sobre esta asistencia..."
              />
              <p className="mt-1 text-right text-[10px] text-grit-muted">{observaciones.length}/500</p>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div>
                {existing && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={saving}
                    className="rounded-grit-md px-3 py-2 text-sm font-medium text-grit-danger hover:bg-rose-500/15 hover:text-grit-danger disabled:opacity-50"
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
                  className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-medium text-grit-subtext hover:bg-grit-cyan/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg hover:bg-grit-cyan/90 disabled:opacity-50"
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
