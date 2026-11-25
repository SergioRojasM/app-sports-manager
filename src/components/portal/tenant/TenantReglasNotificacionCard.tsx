'use client';

import { Fragment, useCallback, useState } from 'react';
import { GritAlert, GritButton, GritConfirmDialog, GritIcon, GritIconButton, GritSwitch, GritTag } from '@/components/ui';
import { useReglasNotificacion } from '@/hooks/portal/tenant/useReglasNotificacion';
import { formatDias, ordenarReglasTimeline } from '@/lib/portal/admin-catalogo.utils';
import {
  REGLA_NOTIFICACION_DESTINATARIOS_LABELS,
  REGLA_NOTIFICACION_MAX_POR_TIPO,
  REGLA_NOTIFICACION_TIPOS,
  type ReglaNotificacion,
} from '@/types/portal/reglas-notificacion.types';
import { ReglaNotificacionFormModal } from './ReglaNotificacionFormModal';
import { SectionMessage, TenantSettingsSection } from './TenantSettingsSection';

type TenantReglasNotificacionCardProps = {
  tenantId: string;
};

function momento(rule: ReglaNotificacion): string {
  return rule.tipo === 'vencimiento_pre' ? 'antes del vencimiento' : 'después del vencimiento';
}

function formatRegla(rule: ReglaNotificacion): string {
  return `${formatDias(rule.dias)} ${momento(rule)}`;
}

function RuleTile({
  rule,
  pending,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: ReglaNotificacion;
  pending: boolean;
  onToggle: (rule: ReglaNotificacion, activo: boolean) => void;
  onEdit: (rule: ReglaNotificacion) => void;
  onDelete: (rule: ReglaNotificacion) => void;
}) {
  const descripcion = formatRegla(rule);

  return (
    <li className="flex min-w-0 flex-1 flex-col gap-3 rounded-[18px] border border-white/[0.06] bg-white/[0.025] px-4 py-3.5">
      <div className="flex items-center gap-3.5">
        <div className="flex shrink-0 flex-col">
          <span className="font-grit-title text-2xl font-light leading-tight text-grit-text">{formatDias(rule.dias)}</span>
          <span className="font-grit-body text-[10px] text-grit-muted">{momento(rule)}</span>
        </div>
        <span aria-hidden className="h-10 w-px shrink-0 bg-white/[0.08]" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="font-grit-body text-[13px] font-semibold leading-snug text-grit-text">
            {REGLA_NOTIFICACION_DESTINATARIOS_LABELS[rule.destinatarios]}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {rule.canal_in_app ? <GritTag tone="neutral">En la plataforma</GritTag> : null}
            {rule.canal_email ? <GritTag tone="neutral">Email</GritTag> : null}
          </div>
        </div>
        <GritSwitch
          checked={rule.activo}
          onChange={(next) => onToggle(rule, next)}
          disabled={pending}
          label={`Activar aviso ${descripcion}`}
        />
      </div>
      <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] pt-2">
        <GritIconButton icon="edit" label={`Editar regla: ${descripcion}`} size="sm" variant="ghost" onClick={() => onEdit(rule)} />
        <GritIconButton icon="delete" label={`Eliminar regla: ${descripcion}`} size="sm" variant="ghost" onClick={() => onDelete(rule)} />
      </div>
    </li>
  );
}

/**
 * "Notificaciones automáticas" settings section (US-0135, `aYwNn` `vR0ZM`): the tenant's expiry
 * alert rules as a chronological timeline of tiles with an inline active switch.
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
    pendingIds,
    toggleActivo,
    toggleError,
    clearToggleError,
  } = useReglasNotificacion({ tenantId });

  const [deleteTarget, setDeleteTarget] = useState<ReglaNotificacion | null>(null);

  const closeDeleteDialog = useCallback(() => {
    if (isSubmitting) return;
    setDeleteTarget(null);
    clearSubmitError();
  }, [isSubmitting, clearSubmitError]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (await handleDelete(deleteTarget.id)) setDeleteTarget(null);
  }, [deleteTarget, handleDelete]);

  const isAtLimit = REGLA_NOTIFICACION_TIPOS.every(
    (tipo) => conteoPorTipo[tipo] >= REGLA_NOTIFICACION_MAX_POR_TIPO,
  );
  const timeline = ordenarReglasTimeline(rules);

  return (
    <>
      <TenantSettingsSection
        icon="notifications_active"
        title="Notificaciones automáticas"
        subtitle="Avisa a tus atletas y administradores antes y después de que venza una suscripción."
        action={
          <span title={isAtLimit ? `Máximo ${REGLA_NOTIFICACION_MAX_POR_TIPO} reglas por tipo` : undefined}>
            <GritButton
              size="sm"
              variant="outline-accent"
              icon="add"
              onClick={openCreateModal}
              disabled={isAtLimit}
              aria-describedby={isAtLimit ? 'rn-limite' : undefined}
            >
              Agregar
            </GritButton>
            {isAtLimit ? (
              <span id="rn-limite" className="sr-only">
                Máximo {REGLA_NOTIFICACION_MAX_POR_TIPO} reglas por tipo
              </span>
            ) : null}
          </span>
        }
      >
        {toggleError ? (
          <GritAlert tone="danger" onDismiss={clearToggleError}>
            {toggleError}
          </GritAlert>
        ) : null}

        {isLoading ? (
          <SectionMessage kind="loading" title="Cargando reglas…" />
        ) : error ? (
          <SectionMessage kind="error" title={error} onRetry={reload} />
        ) : rules.length === 0 ? (
          <SectionMessage
            kind="empty"
            icon="notifications_off"
            title="Aún no hay reglas."
            description="Sin reglas no se envían avisos de vencimiento."
          />
        ) : (
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)_16px_minmax(0,1fr)]">
            {timeline.map((rule, index) => (
              <Fragment key={rule.id}>
                {index > 0 && index % 3 !== 0 ? (
                  <li aria-hidden className="hidden items-center text-grit-muted xl:flex">
                    <GritIcon name="chevron_right" size={16} />
                  </li>
                ) : null}
                <RuleTile
                  rule={rule}
                  pending={pendingIds.has(rule.id)}
                  onToggle={(target, activo) => void toggleActivo(target, activo)}
                  onEdit={openEditModal}
                  onDelete={(target) => {
                    clearSubmitError();
                    setDeleteTarget(target);
                  }}
                />
              </Fragment>
            ))}
          </ol>
        )}

        <p className="font-grit-body text-xs text-grit-muted">Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá).</p>
      </TenantSettingsSection>

      {/* Form drawer: mounted per opening, so its fields start from the rule being edited */}
      {isModalOpen ? (
        <ReglaNotificacionFormModal
          key={selectedRule?.id ?? 'nueva'}
          tenantId={tenantId}
          mode={modalMode}
          editTarget={selectedRule}
          conteoPorTipo={conteoPorTipo}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onClose={closeModal}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      ) : null}

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar regla de notificación"
        message={
          <>
            ¿Deseas eliminar la regla{' '}
            <span className="font-semibold text-grit-text">{deleteTarget ? formatRegla(deleteTarget) : ''}</span>?
            Dejarán de enviarse sus avisos. Esta acción no se puede deshacer.
          </>
        }
        pending={isSubmitting}
        error={deleteTarget ? submitError : null}
        onCancel={closeDeleteDialog}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
