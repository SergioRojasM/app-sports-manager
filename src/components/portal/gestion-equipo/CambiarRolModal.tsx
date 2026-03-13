'use client';

import { useCallback, useState } from 'react';
import type { MiembroTableItem, RolOption } from '@/types/portal/equipo.types';
import { EquipoServiceError } from '@/types/portal/equipo.types';

type CambiarRolModalProps = {
  miembro: MiembroTableItem | null;
  nuevoRol: RolOption | null;
  isSelfDemotion: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
};

export function CambiarRolModal({
  miembro,
  nuevoRol,
  isSelfDemotion,
  onClose,
  onConfirm,
  isLoading,
}: CambiarRolModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      if (err instanceof EquipoServiceError && err.code === 'last_admin') {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Ocurrió un error al cambiar el rol. Intenta de nuevo.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [onConfirm, onClose]);

  if (!miembro || !nuevoRol) return null;

  const fullName = [miembro.nombre, miembro.apellido].filter(Boolean).join(' ');
  const busy = isSubmitting || isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-portal-border bg-navy-deep p-6 shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-turquoise/15">
          <span className="material-symbols-outlined text-2xl text-turquoise" aria-hidden="true">swap_horiz</span>
        </div>

        <h2 className="mb-2 text-center text-lg font-semibold text-slate-100">Cambiar rol</h2>
        <p className="mb-1 text-center text-sm text-slate-300">
          ¿Cambiar el rol de <span className="font-medium text-slate-100">{fullName}</span>?
        </p>
        <p className="mb-4 text-center text-xs text-slate-400">
          Rol actual: <span className="font-medium text-slate-200">{miembro.rol_nombre}</span> → Nuevo rol: <span className="font-medium text-slate-200">{nuevoRol.nombre}</span>
        </p>

        {/* Self-demotion warning */}
        {isSelfDemotion ? (
          <div className="mb-4 rounded-lg border border-amber-400/25 bg-amber-900/20 p-3">
            <p className="text-xs text-amber-200">
              Estás a punto de remover tus permisos de administrador. Si continúas, perderás acceso a las funciones de administración de esta organización.
            </p>
          </div>
        ) : null}

        {/* Error message */}
        {errorMsg ? (
          <div className="mb-4 rounded-lg border border-rose-400/25 bg-rose-900/20 p-3">
            <p className="text-xs text-rose-200">{errorMsg}</p>
          </div>
        ) : null}

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
            disabled={busy}
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
          >
            {busy ? 'Cambiando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
