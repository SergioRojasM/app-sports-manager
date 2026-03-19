'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { useReservas } from '@/hooks/portal/entrenamientos/reservas/useReservas';
import { useReservaForm } from '@/hooks/portal/entrenamientos/reservas/useReservaForm';
import { useAsistencias } from '@/hooks/portal/entrenamientos/reservas/useAsistencias';
import { reservasService } from '@/services/supabase/portal/reservas.service';
import { entrenamientosService } from '@/services/supabase/portal/entrenamientos.service';
import { toCsvString, downloadTextFile } from '@/lib/csv';
import { ReservaStatusBadge } from './ReservaStatusBadge';
import { ReservaFormModal } from './ReservaFormModal';
import { AsistenciaStatusBadge } from './AsistenciaStatusBadge';
import { AsistenciaFormModal } from './AsistenciaFormModal';
import type { UserRole } from '@/types/portal.types';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';
import type { ReservaView } from '@/types/portal/reservas.types';

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
  const [selectedReservaForAsistencia, setSelectedReservaForAsistencia] = useState<ReservaView | null>(null);
  const [savingAsistencia, setSavingAsistencia] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [restrictionLabels, setRestrictionLabels] = useState<string[]>([]);

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

  // Clear booking rejection when panel closes
  useEffect(() => {
    if (!open) {
      reservasHook.clearRejection();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Fetch restriction labels when panel opens
  useEffect(() => {
    if (!open || !instance) {
      setRestrictionLabels([]);
      return;
    }
    const labels: string[] = [];
    if (instance.reserva_antelacion_horas != null) {
      labels.push(`Reservar con al menos ${instance.reserva_antelacion_horas}h de antelación`);
    }
    if (instance.cancelacion_antelacion_horas != null) {
      labels.push(`Cancelar con al menos ${instance.cancelacion_antelacion_horas}h de antelación`);
    }
    entrenamientosService.getInstanceRestrictions(tenantId, instance.id)
      .then(async (rows) => {
        if (rows.length === 0) {
          setRestrictionLabels(labels);
          return;
        }
        const [planes, disciplinas] = await Promise.all([
          entrenamientosService.listPlanOptions(tenantId),
          entrenamientosService.listDisciplineOptions(tenantId),
        ]);
        const planMap = new Map(planes.map((p) => [p.id, p.label]));
        const discMap = new Map(disciplinas.map((d) => [d.id, d.label]));
        for (const row of rows) {
          const parts: string[] = [];
          if (row.usuario_estado) parts.push(`usuario ${row.usuario_estado}`);
          if (row.plan_id) parts.push(`plan "${planMap.get(row.plan_id) ?? row.plan_id}"`);
          if (row.disciplina_id) parts.push(`disciplina "${discMap.get(row.disciplina_id) ?? row.disciplina_id}"`);
          if (row.validar_nivel_disciplina) parts.push('nivel de disciplina válido');
          labels.push(parts.length > 0 ? parts.join(' + ') : 'Sin condiciones específicas');
        }
        setRestrictionLabels(labels);
      })
      .catch(() => setRestrictionLabels(labels));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, instance?.id, tenantId]);

  const asistenciasHook = useAsistencias({
    tenantId,
    entrenamientoId: instance?.id ?? null,
    isEnabled: true,
  });

  const reservaForm = useReservaForm({
    tenantId,
    entrenamientoId: instance?.id ?? '',
    categorias: reservasHook.categorias,
    disciplinaId: instance?.disciplina_id ?? null,
    atletaId: currentUserId,
    onCreateReserva: async (input) => {
      const success = await reservasHook.createReserva(input);
      if (success) {
        onMutationComplete?.();
        void reservasHook.refetchCategorias();
      }
      setFormModalOpen(false);
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

  // Only show active bookings (pendiente / confirmada) to all users
  const displayedReservas = useMemo(() => {
    return reservasHook.reservas.filter((r) => r.estado === 'pendiente' || r.estado === 'confirmada');
  }, [reservasHook.reservas]);

  const handleCancel = async (reservaId: string) => {
    const confirmed = window.confirm('¿Confirmas la cancelación de esta reserva?');
    if (!confirmed) return;

    const success = await reservasHook.cancelReserva(reservaId);
    if (success) {
      onMutationComplete?.();
      void reservasHook.refetchCategorias();
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

  const handleSelfBook = async () => {
    if (!currentUserId) return;
    await reservaForm.openCreate(currentUserId);
    setFormModalOpen(true);
  };

  const handleAdminCreate = async () => {
    await reservaForm.openCreate();
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

  const handleExportCsv = async () => {
    if (!instance) return;
    setIsExporting(true);
    try {
      const rows = await reservasService.getReservasReport(tenantId, instance.id);

      const formatDate = (iso: string | null): string => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      const csvHeaders = [
        'entrenamiento_nombre',
        'entrenamiento_fecha',
        'disciplina',
        'escenario',
        'nivel_disciplina',
        'reserva_id',
        'reserva_estado',
        'fecha_reserva',
        'fecha_cancelacion',
        'notas_reserva',
        'atleta_nombre',
        'atleta_apellido',
        'atleta_email',
        'atleta_telefono',
        'tipo_identificacion',
        'numero_identificacion',
        'asistio',
        'fecha_asistencia',
        'observaciones_asistencia',
        'validado_por_email',
      ] as const;

      const mapped = rows.map((r) => ({
        entrenamiento_nombre: r.entrenamiento_nombre ?? '',
        entrenamiento_fecha: formatDate(r.entrenamiento_fecha),
        disciplina: r.disciplina ?? '',
        escenario: r.escenario ?? '',
        nivel_disciplina: r.nivel_disciplina ?? '',
        reserva_id: r.reserva_id,
        reserva_estado: r.reserva_estado,
        fecha_reserva: formatDate(r.fecha_reserva),
        fecha_cancelacion: formatDate(r.fecha_cancelacion),
        notas_reserva: r.notas_reserva ?? '',
        atleta_nombre: r.atleta_nombre ?? '',
        atleta_apellido: r.atleta_apellido ?? '',
        atleta_email: r.atleta_email ?? '',
        atleta_telefono: r.atleta_telefono ?? '',
        tipo_identificacion: r.tipo_identificacion ?? '',
        numero_identificacion: r.numero_identificacion ?? '',
        asistio: r.asistio === true ? 'Sí' : r.asistio === false ? 'No' : 'Sin registrar',
        fecha_asistencia: formatDate(r.fecha_asistencia),
        observaciones_asistencia: r.observaciones_asistencia ?? '',
        validado_por_email: r.validado_por_email ?? '',
      }));

      const csv = toCsvString(mapped, [...csvHeaders]);

      const slug = instance.nombre.toLowerCase().replace(/\s+/g, '_');
      const dateStr = instance.fecha_hora ? instance.fecha_hora.slice(0, 10) : 'sin-fecha';
      const filename = `reservas_${slug}_${dateStr}.csv`;

      downloadTextFile(csv, filename);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al exportar';
      window.alert(message);
    } finally {
      setIsExporting(false);
    }
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
          <div className="ml-4 flex flex-shrink-0 items-center gap-1">
            {isAdmin && (
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-slate-300 hover:bg-slate-700/40 hover:text-turquoise disabled:opacity-50"
                title="Descargar CSV"
              >
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  {isExporting ? 'hourglass_empty' : 'download'}
                </span>
                <span>{isExporting ? 'Exportando...' : 'Descargar CSV'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-700/40 hover:text-slate-200"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
              <span className="sr-only">Cerrar panel</span>
            </button>
          </div>
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
          {instance.formulario_externo && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-base text-slate-400" aria-hidden="true">link</span>
              <a
                href={instance.formulario_externo}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-turquoise hover:underline"
              >
                Formulario externo
              </a>
            </div>
          )}

          {/* Per-category capacity breakdown */}
          {reservasHook.categorias.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {reservasHook.categorias.map((cat) => {
                const cuposLibres = cat.cupos_asignados - cat.reservas_activas;
                return (
                  <div key={cat.id} className="flex items-center gap-2 text-xs">
                    <span className="rounded-md border border-purple-400/30 bg-purple-500/15 px-1.5 py-0.5 font-medium text-purple-200">
                      {cat.nombre}
                    </span>
                    <span className={`font-semibold ${capacityColorClass(cat.reservas_activas, cat.cupos_asignados)}`}>
                      {cat.reservas_activas} / {cat.cupos_asignados}
                    </span>
                    <span className="text-slate-500">
                      ({cuposLibres} {cuposLibres === 1 ? 'disponible' : 'disponibles'})
                    </span>
                    {!cat.disponible && (
                      <span className="rounded-md border border-rose-400/40 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-rose-200">
                        Lleno
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Restrictions */}
        {restrictionLabels.length > 0 && (
          <div className="border-b border-portal-border px-6 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
              Restricciones
            </div>
            <ul className="mt-1.5 space-y-1">
              {restrictionLabels.map((label, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="mt-0.5 text-slate-500" aria-hidden="true">•</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error */}
        {reservasHook.error && (
          <div className="mx-6 mt-4 rounded-lg border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
            {reservasHook.error}
          </div>
        )}

        {/* Booking rejection alert */}
        {reservasHook.bookingRejection && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-4 py-3 text-sm text-amber-200">
            <span className="material-symbols-outlined mt-0.5 text-base text-amber-300" aria-hidden="true">warning</span>
            <span className="flex-1">{reservasHook.bookingRejection.message}</span>
            <button
              type="button"
              onClick={reservasHook.clearRejection}
              className="ml-2 shrink-0 rounded p-0.5 text-amber-300 hover:bg-amber-500/20 hover:text-amber-100"
              aria-label="Cerrar alerta"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
            </button>
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
          ) : displayedReservas.length === 0 ? (
            <p className="text-sm text-slate-400">No hay reservas registradas.</p>
          ) : (
            <ul className="space-y-3">
              {displayedReservas.map((reserva) => {
                const isOwn = reserva.atleta_id === currentUserId;
                const canCancel =
                  reserva.estado !== 'cancelada' &&
                  reserva.estado !== 'completada' &&
                  (isOwn || isAdmin);
                const canDelete =
                  (reserva.estado === 'confirmada' || reserva.estado === 'cancelada') &&
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
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        {reserva.categoria_nombre && (
                          <span className="rounded-md border border-purple-400/30 bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-200">
                            {reserva.categoria_nombre}
                          </span>
                        )}
                        {(isAdmin || isOwn) && (
                          <AsistenciaStatusBadge asistencia={asistenciasHook.asistenciaMap[reserva.id]} />
                        )}
                        <ReservaStatusBadge estado={reserva.estado} />
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setSelectedReservaForAsistencia(reserva)}
                            title="Verificar asistencia"
                            className="rounded-md p-1 text-slate-400 hover:bg-slate-700/40 hover:text-turquoise"
                          >
                            <span className="material-symbols-outlined text-base" aria-hidden="true">fact_check</span>
                            <span className="sr-only">Verificar asistencia</span>
                          </button>
                        )}
                      </div>
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

      {/* Attendance modal */}
      {selectedReservaForAsistencia && (
        <AsistenciaFormModal
          open={true}
          reservaId={selectedReservaForAsistencia.id}
          atletaNombre={`${selectedReservaForAsistencia.atleta_nombre} ${selectedReservaForAsistencia.atleta_apellido}`.trim()}
          existing={asistenciasHook.asistenciaMap[selectedReservaForAsistencia.id] ?? null}
          saving={savingAsistencia}
          onSave={async (values) => {
            setSavingAsistencia(true);
            const ok = await asistenciasHook.upsertAsistencia(values, selectedReservaForAsistencia.id);
            setSavingAsistencia(false);
            if (ok) {
              await asistenciasHook.refresh();
              setSelectedReservaForAsistencia(null);
            }
          }}
          onDelete={async () => {
            const asistencia = asistenciasHook.asistenciaMap[selectedReservaForAsistencia.id];
            if (!asistencia) return;
            setSavingAsistencia(true);
            const ok = await asistenciasHook.deleteAsistencia(asistencia.id);
            setSavingAsistencia(false);
            if (ok) {
              await asistenciasHook.refresh();
              setSelectedReservaForAsistencia(null);
            }
          }}
          onClose={() => setSelectedReservaForAsistencia(null)}
        />
      )}

      {/* Form modal (create/edit) */}
      <ReservaFormModal
        open={formModalOpen}
        mode={reservaForm.mode}
        tenantId={tenantId}
        showAtletaPicker={isAdmin}
        categorias={reservasHook.categorias}
        loadingCategorias={reservasHook.loadingCategorias}
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
