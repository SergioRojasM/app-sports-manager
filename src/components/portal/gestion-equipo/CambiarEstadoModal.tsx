'use client';

import { useCallback, useState } from 'react';
import type { MiembroEstado, MiembroNovedadTipo, MiembroTableItem } from '@/types/portal/equipo.types';
import { EquipoServiceError } from '@/types/portal/equipo.types';
import { EquipoStatusBadge } from './EquipoStatusBadge';

type CambiarEstadoModalProps = {
  member: MiembroTableItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (nuevoEstado: MiembroEstado, tipo: MiembroNovedadTipo, descripcion?: string) => Promise<void>;
};

const ESTADO_OPTIONS: { value: MiembroEstado; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'mora', label: 'Mora' },
  { value: 'suspendido', label: 'Suspendido' },
  { value: 'inactivo', label: 'Inactivo' },
];

const TIPO_OPTIONS: { value: MiembroNovedadTipo; label: string }[] = [
  { value: 'falta_pago', label: 'Falta de pago' },
  { value: 'inasistencias_acumuladas', label: 'Inasistencias acumuladas' },
  { value: 'suspension_manual', label: 'Suspensión manual' },
  { value: 'reactivacion', label: 'Reactivación' },
  { value: 'activacion_cuenta', label: 'Activación de cuenta' },
  { value: 'otro', label: 'Otro' },
];

export function CambiarEstadoModal({ member, isOpen, onClose, onConfirm }: CambiarEstadoModalProps) {
  const [nuevoEstado, setNuevoEstado] = useState<MiembroEstado | ''>('');
  const [tipo, setTipo] = useState<MiembroNovedadTipo | ''>('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setNuevoEstado('');
    setTipo('');
    setDescripcion('');
    setErrorMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleConfirm = useCallback(async () => {
    if (!nuevoEstado || !tipo) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(nuevoEstado, tipo, descripcion.trim() || undefined);
      resetForm();
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof EquipoServiceError && err.code === 'invalid_transition'
          ? err.message
          : 'Ocurrió un error al cambiar el estado. Intenta de nuevo.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevoEstado, tipo, descripcion, onConfirm, onClose, resetForm]);

  if (!member || !isOpen) return null;

  const fullName = [member.nombre, member.apellido].filter(Boolean).join(' ');
  // A pending member can only be activated or discarded; nobody can be moved into pending.
  const estadoOptions =
    member.estado === 'pendiente_activacion'
      ? ESTADO_OPTIONS.filter((o) => o.value === 'activo' || o.value === 'inactivo')
      : ESTADO_OPTIONS.filter((o) => o.value !== member.estado);
  const canSubmit = nuevoEstado !== '' && tipo !== '' && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-grit-cyan/15">
          <span className="material-symbols-outlined text-2xl text-grit-cyan" aria-hidden="true">swap_horiz</span>
        </div>

        <h2 className="font-grit-title mb-2 text-center text-lg font-semibold text-grit-text">Cambiar estado</h2>
        <p className="mb-1 text-center text-sm text-grit-subtext">
          <span className="font-medium text-grit-text">{fullName}</span>
        </p>
        <div className="mb-4 flex justify-center">
          <EquipoStatusBadge estado={member.estado} />
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Nuevo estado */}
          <div>
            <label htmlFor="ce-nuevo-estado" className="mb-1 block text-xs font-medium text-grit-subtext">
              Nuevo estado <span className="text-grit-danger">*</span>
            </label>
            <select
              id="ce-nuevo-estado"
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value as MiembroEstado)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50"
            >
              <option value="">Seleccionar…</option>
              {estadoOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo de novedad */}
          <div>
            <label htmlFor="ce-tipo" className="mb-1 block text-xs font-medium text-grit-subtext">
              Motivo <span className="text-grit-danger">*</span>
            </label>
            <select
              id="ce-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MiembroNovedadTipo)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none focus:border-grit-cyan/50"
            >
              <option value="">Seleccionar…</option>
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="ce-descripcion" className="mb-1 block text-xs font-medium text-grit-subtext">
              Descripción <span className="text-xs text-grit-muted">(opcional)</span>
            </label>
            <textarea
              id="ce-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Detalle del cambio de estado…"
              className="w-full resize-none rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted outline-none focus:border-grit-cyan/50"
            />
            <p className="mt-0.5 text-right text-[10px] text-grit-muted">{descripcion.length}/500</p>
          </div>
        </div>

        {/* Error */}
        {errorMsg ? (
          <div className="mt-4 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3">
            <p className="text-xs text-grit-danger">{errorMsg}</p>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
            className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
