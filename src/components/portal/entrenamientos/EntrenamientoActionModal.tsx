type EntrenamientoActionModalProps = {
  open: boolean;
  trainingName: string;
  canEdit: boolean;
  canDelete: boolean;
  editDisabledReason?: string;
  deleteDisabledReason?: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function EntrenamientoActionModal({
  open,
  trainingName,
  canEdit,
  canDelete,
  editDisabledReason,
  deleteDisabledReason,
  onClose,
  onEdit,
  onDelete,
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
        <h3 className="text-lg font-semibold text-slate-100">¿Qué deseas hacer?</h3>
        <p className="mt-1 text-sm text-slate-400">Selecciona una acción para el entrenamiento.</p>
        <p className="mt-2 text-sm font-semibold text-slate-200">{trainingName}</p>

        <div className="mt-5 space-y-2">
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