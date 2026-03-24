'use client';

import { useCallback, useState } from 'react';
import type { MiembroEstado, MiembroNovedadTipo, MiembroTableItem } from '@/types/portal/equipo.types';
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
    } catch {
      setErrorMsg('Ocurrió un error al cambiar el estado. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  }, [nuevoEstado, tipo, descripcion, onConfirm, onClose, resetForm]);

  if (!member || !isOpen) return null;

  const fullName = [member.nombre, member.apellido].filter(Boolean).join(' ');
  const canSubmit = nuevoEstado !== '' && tipo !== '' && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-portal-border bg-navy-deep p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-turquoise/15">
          <span className="material-symbols-outlined text-2xl text-turquoise" aria-hidden="true">swap_horiz</span>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-slate-100">Cambiar estado</h2>
        <p className="mb-1 text-center text-sm text-slate-300">
          <span className="font-medium text-slate-100">{fullName}</span>
        </p>
        <div className="mb-4 flex justify-center">
          <EquipoStatusBadge estado={member.estado} />
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Nuevo estado */}
          <div>
            <label htmlFor="ce-nuevo-estado" className="mb-1 block text-xs font-medium text-slate-300">
              Nuevo estado <span className="text-rose-400">*</span>
            </label>
            <select
              id="ce-nuevo-estado"
              value={nuevoEstado}
              onChange={(e) => setNuevoEstado(e.target.value as MiembroEstado)}
              className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-200 outline-none focus:border-turquoise/50"
            >
              <option value="">Seleccionar…</option>
              {ESTADO_OPTIONS.filter((o) => o.value !== member.estado).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo de novedad */}
          <div>
            <label htmlFor="ce-tipo" className="mb-1 block text-xs font-medium text-slate-300">
              Motivo <span className="text-rose-400">*</span>
            </label>
            <select
              id="ce-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MiembroNovedadTipo)}
              className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-200 outline-none focus:border-turquoise/50"
            >
              <option value="">Seleccionar…</option>
              {TIPO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="ce-descripcion" className="mb-1 block text-xs font-medium text-slate-300">
              Descripción <span className="text-xs text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="ce-descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Detalle del cambio de estado…"
              className="w-full resize-none rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-turquoise/50"
            />
            <p className="mt-0.5 text-right text-[10px] text-slate-500">{descripcion.length}/500</p>
          </div>
        </div>

        {/* Error */}
        {errorMsg ? (
          <div className="mt-4 rounded-lg border border-rose-400/25 bg-rose-900/20 p-3">
            <p className="text-xs text-rose-200">{errorMsg}</p>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canSubmit}
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
