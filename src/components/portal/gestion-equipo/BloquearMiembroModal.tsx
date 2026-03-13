'use client';

import { useCallback, useState } from 'react';
import type { MiembroTableItem } from '@/types/portal/equipo.types';

type BloquearMiembroModalProps = {
  miembro: MiembroTableItem | null;
  onClose: () => void;
  onConfirm: (motivo?: string) => Promise<void>;
};

export function BloquearMiembroModal({ miembro, onClose, onConfirm }: BloquearMiembroModalProps) {
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(motivo.trim() || undefined);
      onClose();
    } catch {
      /* Error handled upstream */
    } finally {
      setIsSubmitting(false);
    }
  }, [motivo, onConfirm, onClose]);

  if (!miembro) return null;

  const fullName = [miembro.nombre, miembro.apellido].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-portal-border bg-navy-deep p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <span className="material-symbols-outlined text-2xl text-amber-400" aria-hidden="true">block</span>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-slate-100">Bloquear usuario</h2>
        <p className="mb-4 text-center text-sm text-slate-300">
          ¿Estás seguro de que deseas bloquear a <span className="font-medium text-slate-100">{fullName}</span>?
        </p>

        {/* Motivo */}
        <div className="mb-4">
          <label className="mb-1 block text-xs text-slate-400">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Describe el motivo del bloqueo…"
            className="w-full resize-none rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-turquoise/50"
          />
          <p className="mt-1 text-right text-xs text-slate-500">{motivo.length}/300</p>
        </div>

        <p className="mb-6 text-center text-xs text-slate-400">
          El usuario será removido del equipo y no podrá solicitar acceso nuevamente hasta que se levante el bloqueo.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-amber-400 disabled:opacity-50"
          >
            {isSubmitting ? 'Bloqueando…' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  );
}
