'use client';

import { useCallback, useState } from 'react';
import { useReglasSuspension } from '@/hooks/portal/tenant/useReglasSuspension';
import { ReglaSuspensionFormModal } from './ReglaSuspensionFormModal';
import type { ReglaSuspension } from '@/types/portal/reglas-suspension.types';

type TenantReglasSuspensionCardProps = {
  tenantId: string;
};

function formatCondicion(rule: ReglaSuspension): string {
  const parts: string[] = [];
  if (rule.por_suscripcion) parts.push('Por suscripción');
  if (rule.por_dias_atras > 0) parts.push(`Últimos ${rule.por_dias_atras} días`);
  return parts.length > 0 ? parts.join(' · ') : 'No aplica';
}

function formatDuracion(duracion: number): string {
  return duracion === 0 ? 'Permanente' : `${duracion} días`;
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
  rule: ReglaSuspension;
  onEdit: (r: ReglaSuspension) => void;
  onDelete: (r: ReglaSuspension) => void;
}) {
  return (
    <div
      className={[
        'flex items-center gap-3 rounded-grit-md bg-grit-bg/55 px-3 py-2.5',
        !rule.activo ? 'opacity-50' : '',
      ].join(' ')}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-grit-text truncate">{rule.nombre}</span>
          <StatusBadge activo={rule.activo} />
        </div>
        <p className="mt-0.5 text-xs text-grit-subtext truncate">
          {rule.num_inasistencias} inasistencia{rule.num_inasistencias !== 1 ? 's' : ''} · {formatCondicion(rule)} · {formatDuracion(rule.duracion)}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onEdit(rule)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text"
          title="Editar"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(rule)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-danger"
          title="Eliminar"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            delete
          </span>
        </button>
      </div>
    </div>
  );
}

export function TenantReglasSuspensionCard({ tenantId }: TenantReglasSuspensionCardProps) {
  const {
    rules,
    isLoading,
    isSubmitting,
    error,
    modalMode,
    isModalOpen,
    selectedRule,
    openCreateModal,
    openEditModal,
    closeModal,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useReglasSuspension({ tenantId });

  const [deleteTarget, setDeleteTarget] = useState<ReglaSuspension | null>(null);

  const handleDeleteWithConfirm = useCallback((rule: ReglaSuspension) => {
    setDeleteTarget(rule);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setDeleteTarget(null);
  }, [isSubmitting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await handleDelete(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, handleDelete]);

  const isAtLimit = rules.length >= 3;

  return (
    <>
      <article className="overflow-hidden rounded-grit-md border border-grit-glass-border bg-grit-card shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <header className="flex items-center justify-between border-b border-grit-glass-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined rounded-full bg-grit-cyan/20 p-2 text-[18px] text-grit-cyan"
              aria-hidden="true"
            >
              gavel
            </span>
            <h3 className="font-grit-title text-base font-semibold text-grit-text">Reglas de Suspensión</h3>
          </div>
          <div className="relative group">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={isAtLimit}
              aria-disabled={isAtLimit}
              className="inline-flex items-center gap-1.5 rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg transition hover:bg-grit-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                add
              </span>
              Agregar
            </button>
            {isAtLimit ? (
              <span className="pointer-events-none absolute -bottom-8 right-0 z-10 hidden whitespace-nowrap rounded bg-grit-card px-2 py-1 text-xs text-grit-subtext shadow-lg group-hover:block">
                Máximo 3 reglas por organización
              </span>
            ) : null}
          </div>
        </header>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-2xl text-grit-subtext" aria-hidden="true">
                progress_activity
              </span>
            </div>
          ) : error && rules.length === 0 ? (
            <div
              className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
              role="alert"
            >
              {error}
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span
                className="material-symbols-outlined text-3xl text-grit-muted"
                aria-hidden="true"
              >
                rule
              </span>
              <p className="text-sm text-grit-subtext">
                No hay reglas configuradas.
              </p>
              <p className="text-xs text-grit-muted">
                Agrega una regla para automatizar la suspensión de atletas por inasistencias.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {error ? (
                <div
                  className="mb-2 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} onEdit={openEditModal} onDelete={handleDeleteWithConfirm} />
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Form Modal */}
      <ReglaSuspensionFormModal
        open={isModalOpen}
        tenantId={tenantId}
        mode={modalMode}
        editTarget={selectedRule}
        isSubmitting={isSubmitting}
        submitError={isModalOpen ? error : null}
        onClose={closeModal}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      {/* Delete Confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
            onClick={closeDeleteDialog}
            aria-hidden="true"
          />
          <div
            className="border bg-grit-glass backdrop-blur-md relative z-10 mx-4 w-full max-w-md rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-rs-title"
          >
            <h2 id="delete-rs-title" className="font-grit-title text-lg font-semibold text-grit-text">
              Eliminar regla de suspensión
            </h2>
            <p className="mt-2 text-sm text-grit-subtext">
              ¿Deseas eliminar <span className="font-semibold text-grit-text">{deleteTarget.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>

            {error ? (
              <div
                className="mt-3 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isSubmitting}
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
