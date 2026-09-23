type EntrenamientoActionModalProps = {
  open: boolean;
  trainingName: string;
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  /** Admin-only "Publicar" action (US-0089). */
  isAdmin?: boolean;
  isPublished?: boolean;
  canPublish?: boolean;
  publishDisabledReason?: string;
  onPublicar?: () => void;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onViewReservas?: () => void;
};

export function EntrenamientoActionModal({
  open,
  trainingName,
  canManage,
  canEdit,
  canDelete,
  editDisabledReason,
  deleteDisabledReason,
  isAdmin = false,
  isPublished = false,
  canPublish = false,
  publishDisabledReason,
  onPublicar,
  onClose,
  onEdit,
  onDelete,
  onViewDetail,
  onViewReservas,
}: EntrenamientoActionModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar modal de acciones"
        onClick={onClose}
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-card p-5 shadow-xl">
        <h3 className="font-grit-title text-lg font-semibold text-grit-text">{canManage ? '¿Qué deseas hacer?' : 'Acciones disponibles'}</h3>
        <p className="mt-1 text-sm text-grit-subtext">{canManage ? 'Selecciona una acción para el entrenamiento.' : 'Puedes consultar las reservas de este entrenamiento.'}</p>
        <p className="mt-2 text-sm font-semibold text-grit-text">{trainingName}</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onViewDetail}
            className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-3 text-left transition hover:border-grit-cyan/70"
          >
            <p className="text-sm font-semibold text-grit-text">Ver detalle</p>
            <p className="mt-0.5 text-xs text-grit-subtext">Consulta la información completa de este entrenamiento.</p>
          </button>

          {onViewReservas && (
            <button
              type="button"
              onClick={onViewReservas}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-3 text-left transition hover:border-grit-cyan/70"
            >
              <p className="text-sm font-semibold text-grit-text">Ver reservas</p>
              <p className="mt-0.5 text-xs text-grit-subtext">Consulta las reservas de este entrenamiento.</p>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onEdit}
              disabled={!canEdit}
              className={`w-full rounded-grit-md border px-4 py-3 text-left transition ${
                canEdit
                  ? 'border-grit-glass-border bg-grit-bg/70 hover:border-grit-cyan/70'
                  : 'cursor-not-allowed border-grit-glass-border bg-grit-bg/40 opacity-70'
              }`}
            >
              <p className="text-sm font-semibold text-grit-text">Editar</p>
              <p className="mt-0.5 text-xs text-grit-subtext">
                {canEdit ? 'Permite ajustar datos del entrenamiento único.' : (editDisabledReason ?? 'Acción no disponible.')}
              </p>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              className={`w-full rounded-grit-md border px-4 py-3 text-left transition ${
                canDelete
                  ? 'border-grit-danger/40 bg-rose-500/10 hover:border-grit-danger/70'
                  : 'cursor-not-allowed border-grit-glass-border bg-grit-bg/40 opacity-70'
              }`}
            >
              <p className={`text-sm font-semibold ${canDelete ? 'text-grit-danger' : 'text-grit-text'}`}>Eliminar</p>
              <p className={`mt-0.5 text-xs ${canDelete ? 'text-grit-danger/80' : 'text-grit-subtext'}`}>
                {canDelete ? 'Permite eliminar según las reglas de alcance.' : (deleteDisabledReason ?? 'Acción no disponible.')}
              </p>
            </button>
          )}

          {isAdmin && onPublicar && (
            <button
              type="button"
              onClick={onPublicar}
              disabled={!canPublish}
              className={`w-full rounded-grit-md border px-4 py-3 text-left transition ${
                canPublish
                  ? 'border-grit-cyan/40 bg-grit-cyan/10 hover:border-grit-cyan/70'
                  : 'cursor-not-allowed border-grit-glass-border bg-grit-bg/40 opacity-70'
              }`}
            >
              <p className={`text-sm font-semibold ${canPublish ? 'text-grit-cyan' : 'text-grit-text'}`}>
                {isPublished ? 'Gestionar publicación' : 'Publicar'}
              </p>
              <p className={`mt-0.5 text-xs ${canPublish ? 'text-grit-cyan/80' : 'text-grit-subtext'}`}>
                {canPublish
                  ? isPublished
                    ? 'Edita o despublica el entrenamiento del marketplace público.'
                    : 'Publica este entrenamiento en el marketplace público.'
                  : (publishDisabledReason ?? 'Acción no disponible.')}
              </p>
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}