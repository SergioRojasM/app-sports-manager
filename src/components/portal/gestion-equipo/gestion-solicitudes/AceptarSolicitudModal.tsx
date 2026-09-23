'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import type { SolicitudRow } from '@/types/portal/solicitudes.types';

type AceptarSolicitudModalProps = {
  open: boolean;
  solicitud: SolicitudRow;
  onConfirm: (solicitud: SolicitudRow, rolId: string) => void;
  onClose: () => void;
};

type RolOption = { id: string; nombre: string };

export function AceptarSolicitudModal({
  open,
  solicitud,
  onConfirm,
  onClose,
}: AceptarSolicitudModalProps) {
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [selectedRolId, setSelectedRolId] = useState('');
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const loadRoles = async () => {
      setLoadingRoles(true);
      const supabase = createClient();
      const { data } = await supabase.from('roles').select('id, nombre').order('nombre');
      if (!cancelled) {
        setRoles((data ?? []) as RolOption[]);
        setSelectedRolId('');
        setLoadingRoles(false);
      }
    };
    void loadRoles();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-card p-6 shadow-xl">
        <h2 className="font-grit-title text-lg font-semibold text-grit-text">Aceptar solicitud</h2>
        <p className="mt-1 text-sm text-grit-subtext">
          Asigna un rol a <span className="font-medium text-grit-text">{solicitud.nombre} {solicitud.apellido}</span> para confirmar su ingreso.
        </p>

        <div className="mt-4">
          <label htmlFor="rol-select" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-grit-subtext">
            Rol
          </label>
          {loadingRoles ? (
            <p className="text-sm text-grit-subtext">Cargando roles...</p>
          ) : (
            <select
              id="rol-select"
              value={selectedRolId}
              onChange={(e) => setSelectedRolId(e.target.value)}
              className="w-full rounded-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text focus:border-grit-cyan focus:outline-none"
            >
              <option value="">Seleccionar rol</option>
              {roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-grit-glass-border px-3 py-2 text-sm font-semibold text-grit-subtext hover:bg-grit-cyan/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedRolId}
            onClick={() => onConfirm(solicitud, selectedRolId)}
            className="rounded-md bg-grit-cyan px-3 py-2 text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
