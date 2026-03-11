'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import type { ReservaEstado, CategoriaDisponibilidad } from '@/types/portal/reservas.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AtletaOption = {
  id: string;
  label: string;
};

type ReservaFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  tenantId: string;
  /** Only needed for admin/entrenador create-on-behalf */
  showAtletaPicker: boolean;
  categorias: CategoriaDisponibilidad[];
  loadingCategorias: boolean;
  form: {
    atleta_id: string;
    entrenamiento_categoria_id: string | null;
    notas: string;
    estado: ReservaEstado;
  };
  errors: {
    atleta_id?: string;
    entrenamiento_categoria_id?: string;
    notas?: string;
  };
  isSubmitting: boolean;
  submitError: string | null;
  onUpdateField: (field: 'atleta_id' | 'entrenamiento_categoria_id' | 'notas' | 'estado', value: string) => void;
  onSubmit: () => Promise<boolean>;
  onClose: () => void;
};

// ─────────────────────────────────────────────
// Estado options for edit
// ─────────────────────────────────────────────

const ESTADO_OPTIONS: { value: ReservaEstado; label: string }[] = [
  { value: 'confirmada', label: 'Confirmada' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'completada', label: 'Completada' },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ReservaFormModal({
  open,
  mode,
  tenantId,
  showAtletaPicker,
  categorias,
  loadingCategorias,
  form,
  errors,
  isSubmitting,
  submitError,
  onUpdateField,
  onSubmit,
  onClose,
}: ReservaFormModalProps) {
  const [atletaOptions, setAtletaOptions] = useState<AtletaOption[]>([]);
  const [loadingAtletas, setLoadingAtletas] = useState(false);

  // Load atletas for the picker when open and in create mode with picker visible
  useEffect(() => {
    if (!open || !showAtletaPicker) {
      return;
    }

    let cancelled = false;

    const loadAtletas = async () => {
      setLoadingAtletas(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('miembros_tenant')
          .select(`
            usuario_id,
            usuarios!miembros_tenant_usuario_id_fkey (
              nombre,
              apellido,
              email
            )
          `)
          .eq('tenant_id', tenantId)
          .eq('activo', true);

        if (!cancelled && data) {
          const options: AtletaOption[] = data.map((row) => {
            const usuario = row.usuarios as unknown as {
              nombre: string | null;
              apellido: string | null;
              email: string;
            } | null;
            const name = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || usuario?.email || 'Sin nombre';
            return {
              id: row.usuario_id,
              label: name,
            };
          });
          setAtletaOptions(options.sort((a, b) => a.label.localeCompare(b.label)));
        }
      } catch {
        // Silently fail — picker will be empty
      } finally {
        if (!cancelled) {
          setLoadingAtletas(false);
        }
      }
    };

    void loadAtletas();

    return () => {
      cancelled = true;
    };
  }, [open, showAtletaPicker, tenantId]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">
          {mode === 'create' ? 'Nueva Reserva' : 'Editar Reserva'}
        </h2>

        {submitError && (
          <div className="mb-4 rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Atleta picker — only admin/entrenador create mode */}
          {showAtletaPicker && mode === 'create' && (
            <div>
              <label htmlFor="reserva-atleta" className="mb-1 block text-sm font-medium text-slate-300">
                Atleta
              </label>
              <select
                id="reserva-atleta"
                value={form.atleta_id}
                onChange={(event) => onUpdateField('atleta_id', event.target.value)}
                disabled={loadingAtletas || isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 focus:border-turquoise focus:outline-none"
              >
                <option value="">
                  {loadingAtletas ? 'Cargando atletas...' : 'Selecciona un atleta'}
                </option>
                {atletaOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.atleta_id && (
                <p className="mt-1 text-xs text-rose-300">{errors.atleta_id}</p>
              )}
            </div>
          )}

          {/* Estado selector — only in edit mode */}
          {mode === 'edit' && (
            <div>
              <label htmlFor="reserva-estado" className="mb-1 block text-sm font-medium text-slate-300">
                Estado
              </label>
              <select
                id="reserva-estado"
                value={form.estado}
                onChange={(event) => onUpdateField('estado', event.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 focus:border-turquoise focus:outline-none"
              >
                {ESTADO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Level selector — only in create mode when categories exist */}
          {mode === 'create' && categorias.length > 0 && (
            <fieldset disabled={isSubmitting}>
              <legend className="mb-2 text-sm font-medium text-slate-300">Nivel</legend>
              {loadingCategorias ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="material-symbols-rounded animate-spin text-base">progress_activity</span>
                  Cargando niveles...
                </div>
              ) : (
                <div className="space-y-2">
                  {categorias.map((cat) => {
                    const cuposDisponibles = cat.cupos_asignados - cat.reservas_activas;
                    return (
                      <label
                        key={cat.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                          form.entrenamiento_categoria_id === cat.id
                            ? 'border-turquoise bg-turquoise/10'
                            : 'border-portal-border bg-navy-deep hover:border-slate-500'
                        } ${!cat.disponible ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <input
                          type="radio"
                          name="entrenamiento_categoria_id"
                          value={cat.id}
                          checked={form.entrenamiento_categoria_id === cat.id}
                          onChange={(e) => onUpdateField('entrenamiento_categoria_id', e.target.value)}
                          disabled={!cat.disponible}
                          aria-disabled={!cat.disponible}
                          className="accent-turquoise"
                        />
                        <span className="flex-1 text-sm text-slate-100">{cat.nombre}</span>
                        <span className="text-xs text-slate-400">
                          {cuposDisponibles} {cuposDisponibles === 1 ? 'cupo disponible' : 'cupos disponibles'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {errors.entrenamiento_categoria_id && (
                <p className="mt-1 text-xs text-rose-300">{errors.entrenamiento_categoria_id}</p>
              )}
            </fieldset>
          )}

          {/* Notas */}
          <div>
            <label htmlFor="reserva-notas" className="mb-1 block text-sm font-medium text-slate-300">
              Notas (opcional)
            </label>
            <textarea
              id="reserva-notas"
              value={form.notas}
              onChange={(event) => onUpdateField('notas', event.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-turquoise focus:outline-none"
              placeholder="Notas adicionales..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700/40"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep hover:bg-turquoise/90 disabled:opacity-50"
            >
              {isSubmitting
                ? 'Guardando...'
                : mode === 'create'
                  ? 'Crear Reserva'
                  : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
