'use client';

import { useId } from 'react';
import { BodyPortal, GritButton, GritCard, GritIconButton, cx } from '@/components/ui';
import { useGritDialogFocus } from '@/components/ui/grit/useGritDialogFocus';

type EntrenamientoActionModalProps = {
  open: boolean;
  trainingName: string;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onViewReservas?: () => void;
  /** Admin only (US-0132): opens the create-event wizard pre-filled from this training. */
  onPublicarEnEventos?: () => void;
  canPublicarEnEventos?: boolean;
  publicarEnEventosDisabledReason?: string;
};

type Accion = {
  key: string;
  label: string;
  icon: string;
  hint: string;
  enabled: boolean;
  danger?: boolean;
  onClick: () => void;
};

/** Actions of a training (v3 modal pattern, DESIGN.md §9): opened from every session in the calendar views. */
export function EntrenamientoActionModal({
  open,
  trainingName,
  canManage,
  canEdit,
  canDelete,
  editDisabledReason,
  deleteDisabledReason,
  onClose,
  onEdit,
  onDelete,
  onViewDetail,
  onViewReservas,
  onPublicarEnEventos,
  canPublicarEnEventos = false,
  publicarEnEventosDisabledReason,
}: EntrenamientoActionModalProps) {
  const titleId = useId();
  const panelRef = useGritDialogFocus<HTMLDivElement>({ open, onClose });

  if (!open) {
    return null;
  }

  const acciones: Accion[] = [
    {
      key: 'detalle',
      label: 'Ver detalle',
      icon: 'visibility',
      hint: 'Consulta la información completa de este entrenamiento.',
      enabled: true,
      onClick: onViewDetail,
    },
  ];
  if (onViewReservas) {
    acciones.push({
      key: 'reservas',
      label: 'Ver reservas',
      icon: 'group',
      hint: 'Consulta las reservas de este entrenamiento.',
      enabled: true,
      onClick: onViewReservas,
    });
  }
  if (onPublicarEnEventos) {
    acciones.push({
      key: 'publicar',
      label: 'Publicar en eventos',
      icon: 'campaign',
      hint: canPublicarEnEventos
        ? 'Abre el asistente de eventos con los datos de este entrenamiento.'
        : (publicarEnEventosDisabledReason ?? 'Acción no disponible.'),
      enabled: canPublicarEnEventos,
      onClick: onPublicarEnEventos,
    });
  }
  if (canManage) {
    acciones.push(
      {
        key: 'editar',
        label: 'Editar',
        icon: 'edit',
        hint: canEdit ? 'Permite ajustar datos del entrenamiento único.' : (editDisabledReason ?? 'Acción no disponible.'),
        enabled: canEdit,
        onClick: onEdit,
      },
      {
        key: 'eliminar',
        label: 'Eliminar',
        icon: 'delete',
        hint: canDelete ? 'Permite eliminar según las reglas de alcance.' : (deleteDisabledReason ?? 'Acción no disponible.'),
        enabled: canDelete,
        danger: true,
        onClick: onDelete,
      },
    );
  }

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-[420px] outline-none"
          onClick={(event) => event.stopPropagation()}
        >
          <GritCard variant="glass" padding="lg" className="flex flex-col gap-5">
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-grit-body text-[11px] font-semibold uppercase tracking-[1.3px] text-grit-cyan">
                  {canManage ? '¿Qué deseas hacer?' : 'Acciones disponibles'}
                </p>
                <h2 id={titleId} className="mt-1 break-words font-grit-title text-xl font-medium text-grit-text">
                  {trainingName}
                </h2>
              </div>
              <GritIconButton icon="close" label="Cerrar" size="sm" variant="ghost" onClick={onClose} />
            </header>

            <ul className="flex flex-col gap-2.5">
              {acciones.map((accion) => (
                <li key={accion.key} className="flex flex-col gap-1">
                  <GritButton
                    variant={accion.danger && accion.enabled ? 'danger' : 'secondary'}
                    icon={accion.icon}
                    fullWidth
                    disabled={!accion.enabled}
                    onClick={accion.onClick}
                  >
                    {accion.label}
                  </GritButton>
                  <p className={cx('px-1 font-grit-body text-xs', accion.enabled ? 'text-grit-muted' : 'text-grit-subtext')}>{accion.hint}</p>
                </li>
              ))}
            </ul>
          </GritCard>
        </div>
      </div>
    </BodyPortal>
  );
}
