'use client';

import { useCallback, useRef, useState } from 'react';
import { useReglasNotificacion } from '@/hooks/portal/tenant/useReglasNotificacion';
import { ReglaNotificacionFormModal } from './ReglaNotificacionFormModal';
import {
  REGLA_NOTIFICACION_DESTINATARIOS_LABELS,
  REGLA_NOTIFICACION_MAX_POR_TIPO,
  REGLA_NOTIFICACION_TIPOS,
  REGLA_NOTIFICACION_TIPO_LABELS,
  type ReglaNotificacion,
} from '@/types/portal/reglas-notificacion.types';

type TenantReglasNotificacionCardProps = {
  tenantId: string;
};

function formatRegla(rule: ReglaNotificacion): string {
  const dias = rule.dias === 1 ? '1 día' : `${rule.dias} días`;
  return rule.tipo === 'vencimiento_pre' ? `${dias} antes de vencer` : `${dias} después de vencer`;
}

function formatCanales(rule: ReglaNotificacion): string {
  return [rule.canal_in_app ? 'En la plataforma' : null, rule.canal_email ? 'Correo' : null]
    .filter(Boolean)
    .join(' · ');
}

function StatusBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-400">
      Activa
    </span>
  ) : (
    <span className="rounded-full bg-grit-subtext/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-grit-subtext">
      Inactiva
    </span>
  );
}

function RuleRow({
  rule,
  onEdit,
  onDelete,
}: {
  rule: ReglaNotificacion;
  onEdit: (rule: ReglaNotificacion, trigger: HTMLElement) => void;
  onDelete: (rule: ReglaNotificacion, trigger: HTMLElement) => void;
}) {
  const descripcion = formatRegla(rule);

  return (
    <li
      className={[
        'flex items-center gap-3 rounded-grit-md bg-grit-bg/55 px-3 py-2.5',
        !rule.activo ? 'opacity-60' : '',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-grit-text">{descripcion}</span>
          <StatusBadge activo={rule.activo} />
        </div>
        <p className="mt-0.5 text-xs text-grit-subtext">
          {REGLA_NOTIFICACION_DESTINATARIOS_LABELS[rule.destinatarios]} · {formatCanales(rule)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={(event) => onEdit(rule, event.currentTarget)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text"
          title="Editar"
          aria-label={`Editar regla: ${descripcion}`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
        </button>
        <button
          type="button"
          onClick={(event) => onDelete(rule, event.currentTarget)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-danger"
          title="Eliminar"
          aria-label={`Eliminar regla: ${descripcion}`}
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            delete
          </span>
        </button>
      </div>
    </li>
  );
}

/**
 * "Notificaciones automáticas" card of Gestión de organización (US-0135): the tenant's rules for
 * subscription expiry alerts. Same look as TenantReglasSuspensionCard.
 */
export function TenantReglasNotificacionCard({ tenantId }: TenantReglasNotificacionCardProps) {
  const {
    rules,
    conteoPorTipo,
    isLoading,
    isSubmitting,
    error,
    submitError,
    clearSubmitError,
    reload,
    isModalOpen,
    modalMode,
    selectedRule,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useReglasNotificacion({ tenantId });

  const [deleteTarget, setDeleteTarget] = useState<ReglaNotificacion | null>(null);
  // Element that opened the modal or the dialog, to give focus back when it closes
  const triggerRef = useRef<HTMLElement | null>(null);

  const restoreFocus = useCallback(() => {
    const trigger = triggerRef.current;
    if (trigger?.isConnected) trigger.focus();
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    closeModal();
    restoreFocus();
  }, [isSubmitting, closeModal, restoreFocus]);

  // A successful save closes the modal from the hook: give focus back here too
  const handleCreateAndFocus = useCallback(
    async (payload: Parameters<typeof handleCreate>[0]) => {
      const ok = await handleCreate(payload);
      if (ok) restoreFocus();
      return ok;
    },
    [handleCreate, restoreFocus],
  );

  const handleUpdateAndFocus = useCallback(
    async (id: string, payload: Parameters<typeof handleUpdate>[1]) => {
      const ok = await handleUpdate(id, payload);
      if (ok) restoreFocus();
      return ok;
    },
    [handleUpdate, restoreFocus],
  );

  const closeDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setDeleteTarget(null);
    clearSubmitError();
    restoreFocus();
  }, [isSubmitting, clearSubmitError, restoreFocus]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (await handleDelete(deleteTarget.id)) setDeleteTarget(null);
  }, [deleteTarget, handleDelete]);

  const isAtLimit = REGLA_NOTIFICACION_TIPOS.every(
    (tipo) => conteoPorTipo[tipo] >= REGLA_NOTIFICACION_MAX_POR_TIPO,
  );

  return (
    <>
      <article className="overflow-hidden rounded-grit-md border border-grit-glass-border bg-grit-card shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <header className="flex items-center justify-between gap-3 border-b border-grit-glass-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="material-symbols-outlined rounded-full bg-grit-cyan/20 p-2 text-[18px] text-grit-cyan"
              aria-hidden="true"
            >
              notifications_active
            </span>
            <div className="min-w-0">
              <h3 className="font-grit-title text-base font-semibold text-grit-text">Notificaciones automáticas</h3>
              <p className="text-xs text-grit-subtext">
                Avisa a tus atletas y administradores antes y después de que venza una suscripción.
              </p>
            </div>
          </div>
          <div className="group relative shrink-0">
            <button
              type="button"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                openCreateModal();
              }}
              disabled={isAtLimit}
              aria-describedby={isAtLimit ? 'rn-limite' : undefined}
              className="inline-flex items-center gap-1.5 rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg transition hover:bg-grit-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                add
              </span>
              Agregar
            </button>
            {isAtLimit ? (
              <span
                id="rn-limite"
                className="pointer-events-none absolute -bottom-8 right-0 z-10 hidden whitespace-nowrap rounded bg-grit-card px-2 py-1 text-xs text-grit-subtext shadow-lg group-hover:block"
              >
                Máximo {REGLA_NOTIFICACION_MAX_POR_TIPO} reglas por tipo
              </span>
            ) : null}
          </div>
        </header>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8" role="status" aria-label="Cargando reglas">
              <span className="material-symbols-outlined animate-spin text-2xl text-grit-subtext" aria-hidden="true">
                progress_activity
              </span>
            </div>
          ) : error ? (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
              role="alert"
            >
              <span>{error}</span>
              <button
                type="button"
                onClick={reload}
                className="rounded-grit-md border border-grit-danger/40 px-3 py-1 text-xs font-semibold text-grit-danger transition hover:bg-grit-danger/10"
              >
                Reintentar
              </button>
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-grit-muted" aria-hidden="true">
                notifications_off
              </span>
              <p className="text-sm text-grit-subtext">Aún no hay reglas.</p>
              <p className="text-xs text-grit-muted">Sin reglas no se envían avisos de vencimiento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {REGLA_NOTIFICACION_TIPOS.map((tipo) => {
                const grupo = rules.filter((rule) => rule.tipo === tipo).sort((a, b) => a.dias - b.dias);
                if (grupo.length === 0) return null;
                return (
                  <section key={tipo} aria-labelledby={`rn-grupo-${tipo}`}>
                    <h4
                      id={`rn-grupo-${tipo}`}
                      className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-grit-subtext"
                    >
                      {REGLA_NOTIFICACION_TIPO_LABELS[tipo]}
                    </h4>
                    <ul className="space-y-2">
                      {grupo.map((rule) => (
                        <RuleRow
                          key={rule.id}
                          rule={rule}
                          onEdit={(target, trigger) => {
                            triggerRef.current = trigger;
                            openEditModal(target);
                          }}
                          onDelete={(target, trigger) => {
                            triggerRef.current = trigger;
                            clearSubmitError();
                            setDeleteTarget(target);
                          }}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          )}

          <p className="mt-4 text-xs text-grit-muted">
            Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá).
          </p>
        </div>
      </article>

      {/* Form modal: mounted per opening, so its fields start from the rule being edited */}
      {isModalOpen ? (
        <ReglaNotificacionFormModal
          key={selectedRule?.id ?? 'nueva'}
          tenantId={tenantId}
          mode={modalMode}
          editTarget={selectedRule}
          conteoPorTipo={conteoPorTipo}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={handleCloseModal}
          onCreate={handleCreateAndFocus}
          onUpdate={handleUpdateAndFocus}
        />
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
            onClick={closeDeleteDialog}
            aria-hidden="true"
          />
          <div
            className="relative z-10 mx-4 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-6 shadow-2xl backdrop-blur-md"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-rn-title"
          >
            <h2 id="delete-rn-title" className="font-grit-title text-lg font-semibold text-grit-text">
              Eliminar regla de notificación
            </h2>
            <p className="mt-2 text-sm text-grit-subtext">
              ¿Deseas eliminar la regla{' '}
              <span className="font-semibold text-grit-text">{formatRegla(deleteTarget)}</span>? Dejarán de enviarse
              sus avisos. Esta acción no se puede deshacer.
            </p>

            {submitError ? (
              <div
                className="mt-3 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
                role="alert"
              >
                {submitError}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isSubmitting}
                autoFocus
                className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-grit-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  delete
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
