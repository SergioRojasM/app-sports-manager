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
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-bg p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15">
          <span className="material-symbols-outlined text-2xl text-amber-400" aria-hidden="true">block</span>
        </div>

        <h2 className="font-grit-title mb-2 text-center text-lg font-semibold text-grit-text">Bloquear usuario</h2>
        <p className="mb-4 text-center text-sm text-grit-subtext">
          ¿Estás seguro de que deseas bloquear a <span className="font-medium text-grit-text">{fullName}</span>?
        </p>

        {/* Motivo */}
        <div className="mb-4">
          <label className="mb-1 block text-xs text-grit-subtext">Motivo (opcional)</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Describe el motivo del bloqueo…"
            className="w-full resize-none rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition placeholder:text-grit-muted focus:border-grit-cyan/50"
          />
          <p className="mt-1 text-right text-xs text-grit-muted">{motivo.length}/300</p>
        </div>

        <p className="mb-6 text-center text-xs text-grit-subtext">
          El usuario será removido del equipo y no podrá solicitar acceso nuevamente hasta que se levante el bloqueo.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="rounded-grit-md bg-amber-500 px-4 py-2 text-sm font-semibold text-grit-bg transition hover:bg-amber-400 disabled:opacity-50"
          >
            {isSubmitting ? 'Bloqueando…' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  );
}
