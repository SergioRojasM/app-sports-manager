'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import type { ReservaEstado, CategoriaDisponibilidad } from '@/types/portal/reservas.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type AtletaOption = {
  id: string;
  label: string;
  /** "{tipo}: {numero}" or '' when no identification data */
  identificacion: string;
  /** Lowercase concat of label + numero_identificacion for fast client-side filtering */
  searchText: string;
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

  // Combobox state
  const [searchInput, setSearchInput] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
              email,
              numero_identificacion,
              tipo_identificacion
            )
          `)
          .eq('tenant_id', tenantId)
          .neq('estado', 'inactivo');

        if (!cancelled && data) {
          const options: AtletaOption[] = data.map((row) => {
            const usuario = row.usuarios as unknown as {
              nombre: string | null;
              apellido: string | null;
              email: string;
              numero_identificacion: string | null;
              tipo_identificacion: string | null;
            } | null;
            const label = [usuario?.nombre, usuario?.apellido].filter(Boolean).join(' ') || usuario?.email || 'Sin nombre';
            const identificacion =
              usuario?.numero_identificacion
                ? `${usuario.tipo_identificacion ?? 'ID'}: ${usuario.numero_identificacion}`
                : '';
            return {
              id: row.usuario_id,
              label,
              identificacion,
              searchText: `${label} ${usuario?.numero_identificacion ?? ''}`.toLowerCase(),
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

  // Auto-focus the search input when the modal opens in admin create mode
  useEffect(() => {
    if (open && showAtletaPicker && mode === 'create') {
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open, showAtletaPicker, mode]);

  // Reset combobox state when modal closes
  useEffect(() => {
    if (!open) {
      setSearchInput('');
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  // ── Combobox helpers ──────────────────────────────

  const filteredOptions = searchInput.trim()
    ? atletaOptions.filter((o) => o.searchText.includes(searchInput.toLowerCase()))
    : atletaOptions;

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(event.target.value);
    onUpdateField('atleta_id', '');
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
  };

  const handleSearchFocus = () => {
    setIsDropdownOpen(true);
  };

  const handleSearchBlur = () => {
    setTimeout(() => setIsDropdownOpen(false), 150);
  };

  const handleOptionSelect = (option: AtletaOption) => {
    onUpdateField('atleta_id', option.id);
    setSearchInput(option.label);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setIsDropdownOpen(true);
        setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleOptionSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // ─────────────────────────────────────────────

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
              <label htmlFor="reserva-atleta-search" className="mb-1 block text-sm font-medium text-slate-300">
                Atleta
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  id="reserva-atleta-search"
                  type="text"
                  role="combobox"
                  aria-expanded={isDropdownOpen}
                  aria-controls="reserva-atleta-listbox"
                  aria-autocomplete="list"
                  aria-activedescendant={
                    highlightedIndex >= 0 ? `atleta-option-${highlightedIndex}` : undefined
                  }
                  value={searchInput}
                  onChange={handleSearchChange}
                  onFocus={handleSearchFocus}
                  onBlur={handleSearchBlur}
                  onKeyDown={handleKeyDown}
                  disabled={loadingAtletas || isSubmitting}
                  placeholder={loadingAtletas ? 'Cargando atletas…' : 'Buscar por nombre o cédula…'}
                  autoComplete="off"
                  className="w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-turquoise focus:outline-none disabled:opacity-60"
                />
                {isDropdownOpen && !loadingAtletas && (
                  <ul
                    id="reserva-atleta-listbox"
                    role="listbox"
                    aria-label="Atletas"
                    className="absolute left-0 top-full z-[60] mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-portal-border bg-navy-deep shadow-xl"
                  >
                    {filteredOptions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-slate-500">Sin resultados</li>
                    ) : (
                      filteredOptions.map((option, index) => (
                        <li
                          key={option.id}
                          id={`atleta-option-${index}`}
                          role="option"
                          aria-selected={form.atleta_id === option.id}
                          onMouseDown={(e) => {
                            // Prevent blur from firing before the click registers
                            e.preventDefault();
                            handleOptionSelect(option);
                          }}
                          className={`cursor-pointer px-3 py-2 transition-colors ${
                            index === highlightedIndex
                              ? 'bg-turquoise/20 text-turquoise'
                              : 'text-slate-100 hover:bg-slate-700/50'
                          }`}
                        >
                          <p className="text-sm font-medium leading-tight">{option.label}</p>
                          {option.identificacion && (
                            <p className="text-xs text-slate-400">{option.identificacion}</p>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
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
