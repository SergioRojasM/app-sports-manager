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
        className="absolute inset-0 bg-slate-950/70"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl border border-portal-border bg-navy-medium p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-100">{canManage ? '¿Qué deseas hacer?' : 'Acciones disponibles'}</h3>
        <p className="mt-1 text-sm text-slate-400">{canManage ? 'Selecciona una acción para el entrenamiento.' : 'Puedes consultar las reservas de este entrenamiento.'}</p>
        <p className="mt-2 text-sm font-semibold text-slate-200">{trainingName}</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onViewDetail}
            className="w-full rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-3 text-left transition hover:border-turquoise/70"
          >
            <p className="text-sm font-semibold text-slate-100">Ver detalle</p>
            <p className="mt-0.5 text-xs text-slate-400">Consulta la información completa de este entrenamiento.</p>
          </button>

          {onViewReservas && (
            <button
              type="button"
              onClick={onViewReservas}
              className="w-full rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-3 text-left transition hover:border-turquoise/70"
            >
              <p className="text-sm font-semibold text-slate-100">Ver reservas</p>
              <p className="mt-0.5 text-xs text-slate-400">Consulta las reservas de este entrenamiento.</p>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onEdit}
              disabled={!canEdit}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                canEdit
                  ? 'border-portal-border bg-navy-deep/70 hover:border-turquoise/70'
                  : 'cursor-not-allowed border-portal-border/60 bg-navy-deep/40 opacity-70'
              }`}
            >
              <p className="text-sm font-semibold text-slate-100">Editar</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {canEdit ? 'Permite ajustar datos del entrenamiento único.' : (editDisabledReason ?? 'Acción no disponible.')}
              </p>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                canDelete
                  ? 'border-rose-400/40 bg-rose-500/10 hover:border-rose-300/70'
                  : 'cursor-not-allowed border-portal-border/60 bg-navy-deep/40 opacity-70'
              }`}
            >
              <p className={`text-sm font-semibold ${canDelete ? 'text-rose-200' : 'text-slate-200'}`}>Eliminar</p>
              <p className={`mt-0.5 text-xs ${canDelete ? 'text-rose-200/80' : 'text-slate-400'}`}>
                {canDelete ? 'Permite eliminar según las reglas de alcance.' : (deleteDisabledReason ?? 'Acción no disponible.')}
              </p>
            </button>
          )}

          {isAdmin && onPublicar && (
            <button
              type="button"
              onClick={onPublicar}
              disabled={!canPublish}
              className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                canPublish
                  ? 'border-turquoise/40 bg-turquoise/10 hover:border-turquoise/70'
                  : 'cursor-not-allowed border-portal-border/60 bg-navy-deep/40 opacity-70'
              }`}
            >
              <p className={`text-sm font-semibold ${canPublish ? 'text-turquoise' : 'text-slate-200'}`}>
                {isPublished ? 'Gestionar publicación' : 'Publicar'}
              </p>
              <p className={`mt-0.5 text-xs ${canPublish ? 'text-turquoise/80' : 'text-slate-400'}`}>
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
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}