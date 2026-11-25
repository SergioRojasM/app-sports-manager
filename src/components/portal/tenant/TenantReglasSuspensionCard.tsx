'use client';

import { useCallback, useState } from 'react';
import { GritButton, GritConfirmDialog, GritIcon, GritIconButton, GritTag } from '@/components/ui';
import { useReglasSuspension } from '@/hooks/portal/tenant/useReglasSuspension';
import type { ReglaSuspension } from '@/types/portal/reglas-suspension.types';
import { ReglaSuspensionFormModal } from './ReglaSuspensionFormModal';
import { SectionMessage, TenantSettingsSection } from './TenantSettingsSection';

type TenantReglasSuspensionCardProps = {
  tenantId: string;
};

/** Prefill of the suggested rule offered by the empty state (`aYwNn` `qLwyb`). */
export const REGLA_SUSPENSION_SUGERIDA = {
  nombre: '3 inasistencias seguidas',
  num_inasistencias: 3,
  por_suscripcion: true,
  por_dias_atras: 0,
  duracion: 7,
} as const;

function formatCondicion(rule: ReglaSuspension): string {
  const parts: string[] = [];
  if (rule.por_suscripcion) parts.push('Por suscripción');
  if (rule.por_dias_atras > 0) parts.push(`Últimos ${rule.por_dias_atras} días`);
  return parts.length > 0 ? parts.join(' · ') : 'No aplica';
}

function formatDuracion(duracion: number): string {
  return duracion === 0 ? 'Permanente' : `${duracion} días`;
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
    <li className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{rule.nombre}</span>
          <GritTag tone={rule.activo ? 'accent' : 'neutral'} dot>
            {rule.activo ? 'Activa' : 'Inactiva'}
          </GritTag>
        </div>
        <p className="truncate font-grit-body text-[11px] text-grit-muted">
          {rule.num_inasistencias} inasistencia{rule.num_inasistencias !== 1 ? 's' : ''} · {formatCondicion(rule)} ·{' '}
          {formatDuracion(rule.duracion)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <GritIconButton icon="edit" label={`Editar ${rule.nombre}`} size="sm" variant="ghost" onClick={() => onEdit(rule)} />
        <GritIconButton icon="delete" label={`Eliminar ${rule.nombre}`} size="sm" variant="ghost" onClick={() => onDelete(rule)} />
      </div>
    </li>
  );
}

/** "Reglas de suspensión" settings section (`aYwNn` `GFsAW`). */
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
    reload,
  } = useReglasSuspension({ tenantId });

  const [deleteTarget, setDeleteTarget] = useState<ReglaSuspension | null>(null);
  const [useSuggestion, setUseSuggestion] = useState(false);

  const closeDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setDeleteTarget(null);
  }, [isSubmitting]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await handleDelete(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, handleDelete]);

  const openCreate = (suggested: boolean) => {
    setUseSuggestion(suggested);
    openCreateModal();
  };

  const isAtLimit = rules.length >= 3;
  const showListError = Boolean(error) && !isModalOpen && !deleteTarget;

  return (
    <>
      <TenantSettingsSection
        icon="gavel"
        title="Reglas de suspensión"
        subtitle="Automatiza suspensiones por inasistencia."
        action={
          <span title={isAtLimit ? 'Máximo 3 reglas por organización' : undefined}>
            <GritButton
              size="sm"
              variant="outline-accent"
              icon="add"
              onClick={() => openCreate(false)}
              disabled={isAtLimit}
              aria-disabled={isAtLimit}
              aria-describedby={isAtLimit ? 'reglas-suspension-limite' : undefined}
            >
              Agregar
            </GritButton>
            {isAtLimit ? (
              <span id="reglas-suspension-limite" className="sr-only">
                Máximo 3 reglas por organización
              </span>
            ) : null}
          </span>
        }
      >
        {isLoading ? (
          <SectionMessage kind="loading" title="Cargando reglas…" />
        ) : showListError && rules.length === 0 ? (
          <SectionMessage kind="error" title={error} onRetry={() => void reload()} />
        ) : rules.length === 0 ? (
          <SectionMessage kind="empty" icon="playlist_remove" title="Aún no hay reglas configuradas">
            <div className="flex w-full max-w-md flex-wrap items-center justify-between gap-2.5 rounded-full border border-grit-cyan/25 bg-grit-cyan/[0.06] py-1.5 pl-3.5 pr-1.5 text-left">
              <span className="flex min-w-0 items-center gap-2.5 font-grit-body text-xs text-grit-subtext">
                <GritIcon name="auto_awesome" size={14} className="text-grit-cyan" />
                Sugerida: suspender tras 3 inasistencias seguidas
              </span>
              <GritButton size="sm" onClick={() => openCreate(true)} aria-label="Usar la regla sugerida">
                Usar
              </GritButton>
            </div>
          </SectionMessage>
        ) : (
          <>
            {showListError ? <SectionMessage kind="error" title={error} onRetry={() => void reload()} /> : null}
            <ul className="flex flex-col gap-2">
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} onEdit={openEditModal} onDelete={setDeleteTarget} />
              ))}
            </ul>
          </>
        )}
      </TenantSettingsSection>

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
        initialValues={useSuggestion ? REGLA_SUSPENSION_SUGERIDA : undefined}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar regla de suspensión"
        message={
          <>
            ¿Deseas eliminar <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>? Esta acción no
            se puede deshacer.
          </>
        }
        pending={isSubmitting}
        error={deleteTarget ? error : null}
        onCancel={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
