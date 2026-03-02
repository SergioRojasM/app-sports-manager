'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { useReservas } from '@/hooks/portal/entrenamientos/reservas/useReservas';
import { useReservaForm } from '@/hooks/portal/entrenamientos/reservas/useReservaForm';
import { ReservaStatusBadge } from './ReservaStatusBadge';
import { ReservaFormModal } from './ReservaFormModal';
import type { UserRole } from '@/types/portal.types';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type ReservasPanelProps = {
  open: boolean;
  tenantId: string;
  instance: TrainingInstance | null;
  role: UserRole | null;
  onClose: () => void;
  onMutationComplete?: () => void;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function capacityColorClass(activas: number, maximo: number | null): string {
  if (maximo === null) return 'text-slate-400';
  const ratio = activas / maximo;
  if (ratio >= 1) return 'text-rose-300';
  if (ratio >= 0.7) return 'text-amber-300';
  return 'text-emerald-300';
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ReservasPanel({
  open,
  tenantId,
  instance,
  role,
  onClose,
  onMutationComplete,
}: ReservasPanelProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);

  const isAdmin = role === 'administrador' || role === 'entrenador';

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  const reservasHook = useReservas({
    tenantId,
    entrenamientoId: instance?.id ?? null,
    role,
  });

  const reservaForm = useReservaForm({
    tenantId,
    entrenamientoId: instance?.id ?? '',
    onCreateReserva: async (input) => {
      const success = await reservasHook.createReserva(input);
      if (success) {
        setFormModalOpen(false);
        onMutationComplete?.();
      }
      return success;
    },
    onUpdateReserva: async (id, input) => {
      const success = await reservasHook.updateReserva(id, input);
      if (success) {
        setFormModalOpen(false);
        onMutationComplete?.();
      }
      return success;
    },
  });

  // My active booking (for atleta view)
  const myReserva = useMemo(() => {
    if (!currentUserId) return null;
    return reservasHook.reservas.find(
      (r) => r.atleta_id === currentUserId && r.estado !== 'cancelada',
    ) ?? null;
  }, [currentUserId, reservasHook.reservas]);

  const handleCancel = async (reservaId: string) => {
    const confirmed = window.confirm('¿Confirmas la cancelación de esta reserva?');
    if (!confirmed) return;

    const success = await reservasHook.cancelReserva(reservaId);
    if (success) {
      onMutationComplete?.();
    }
  };

  const handleDelete = async (reservaId: string) => {
    const confirmed = window.confirm('¿Confirmas la eliminación de esta reserva?');
    if (!confirmed) return;

    const success = await reservasHook.deleteReserva(reservaId);
    if (success) {
      onMutationComplete?.();
    }
  };

  const handleSelfBook = () => {
    if (!currentUserId) return;
    reservaForm.openCreate(currentUserId);
    setFormModalOpen(true);
  };

  const handleAdminCreate = () => {
    reservaForm.openCreate();
    setFormModalOpen(true);
  };

  const handleEdit = (reservaId: string) => {
    const reserva = reservasHook.reservas.find((r) => r.id === reservaId);
    if (!reserva) return;
    reservaForm.openEdit(reservaId, {
      atleta_id: reserva.atleta_id,
      notas: reserva.notas ?? '',
      estado: reserva.estado,
    });
    setFormModalOpen(true);
  };

  if (!open || !instance) {
    return null;
  }

  const { capacidad } = reservasHook;
  const capacidadLabel = capacidad
    ? `${capacidad.reservas_activas}${capacidad.cupo_maximo !== null ? ` / ${capacidad.cupo_maximo}` : ''}`
    : '—';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-portal-border bg-navy-deep shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Reservas: ${instance.nombre}`}
      >
        {/* Header */}
        <header className="flex items-start justify-between border-b border-portal-border px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-slate-100">{instance.nombre}</h2>
            <p className="mt-1 text-sm text-slate-400">Reservas del entrenamiento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex-shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
            <span className="sr-only">Cerrar panel</span>
          </button>
        </header>

        {/* Capacity indicator */}
        <div className="border-b border-portal-border px-6 py-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="material-symbols-outlined text-base text-slate-400" aria-hidden="true">group</span>
            <span className="text-slate-300">Capacidad:</span>
            <span className={`font-semibold ${capacidad ? capacityColorClass(capacidad.reservas_activas, capacidad.cupo_maximo) : 'text-slate-400'}`}>
              {capacidadLabel}
            </span>
            {capacidad && !capacidad.disponible && (
              <span className="rounded-md border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-200">
                Lleno
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {reservasHook.error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {reservasHook.error}
          </div>
        )}

        {/* Actions bar */}
        <div className="border-b border-portal-border px-6 py-3">
          {isAdmin ? (
            <button
              type="button"
              onClick={handleAdminCreate}
              disabled={capacidad !== null && !capacidad.disponible}
              className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-3 py-1.5 text-sm font-semibold text-navy-deep hover:bg-turquoise/90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">person_add</span>
              Nueva reserva
            </button>
          ) : !myReserva ? (
            <button
              type="button"
              onClick={handleSelfBook}
              disabled={capacidad !== null && !capacidad.disponible}
              className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-3 py-1.5 text-sm font-semibold text-navy-deep hover:bg-turquoise/90 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">bookmark_add</span>
              Reservar
            </button>
          ) : (
            <p className="text-sm text-slate-400">Ya tienes una reserva activa para este entrenamiento.</p>
          )}
        </div>

        {/* Reservas list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {reservasHook.isLoading ? (
            <p className="text-sm text-slate-400">Cargando reservas...</p>
          ) : reservasHook.reservas.length === 0 ? (
            <p className="text-sm text-slate-400">No hay reservas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {reservasHook.reservas.map((reserva) => {
                const isOwn = reserva.atleta_id === currentUserId;
                const canCancel =
                  reserva.estado !== 'cancelada' &&
                  reserva.estado !== 'completada' &&
                  (isOwn || isAdmin);
                const canDelete =
                  (reserva.estado === 'pendiente' || reserva.estado === 'cancelada') &&
                  isAdmin;
                const canEdit = isAdmin;

                return (
                  <li
                    key={reserva.id}
                    className={`rounded-lg border p-3 ${
                      isOwn
                        ? 'border-turquoise/30 bg-turquoise/5'
                        : 'border-portal-border bg-navy-medium/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {reserva.atleta_nombre} {reserva.atleta_apellido}
                          {isOwn && (
                            <span className="ml-2 text-[10px] font-semibold uppercase text-turquoise">(Tú)</span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{reserva.atleta_email}</p>
                      </div>
                      <ReservaStatusBadge estado={reserva.estado} />
                    </div>

                    {reserva.notas && (
                      <p className="mt-2 text-xs text-slate-400 italic">{reserva.notas}</p>
                    )}

                    {/* Row actions */}
                    {(canEdit || canCancel || canDelete) && (
                      <div className="mt-3 flex items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleEdit(reserva.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/40 hover:text-turquoise"
                          >
                            Editar
                          </button>
                        )}
                        {canCancel && (
                          <button
                            type="button"
                            onClick={() => handleCancel(reserva.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/40 hover:text-amber-300"
                          >
                            Cancelar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(reserva.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-slate-300 hover:bg-rose-500/20 hover:text-rose-300"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Form modal (create/edit) */}
      <ReservaFormModal
        open={formModalOpen}
        mode={reservaForm.mode}
        tenantId={tenantId}
        showAtletaPicker={isAdmin}
        form={reservaForm.form}
        errors={reservaForm.errors}
        isSubmitting={reservaForm.isSubmitting}
        submitError={reservaForm.submitError}
        onUpdateField={reservaForm.updateField}
        onSubmit={reservaForm.mode === 'create' ? reservaForm.submitCreate : reservaForm.submitUpdate}
        onClose={() => {
          setFormModalOpen(false);
          reservaForm.reset();
        }}
      />
    </>
  );
}
