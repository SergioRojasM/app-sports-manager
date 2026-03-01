import type { TrainingScope } from '@/types/portal/entrenamientos.types';

type EntrenamientoScopeModalProps = {
  open: boolean;
  action: 'edit' | 'delete' | null;
  allowedScopes: TrainingScope[];
  onClose: () => void;
  onConfirm: (scope: TrainingScope) => void;
};

const SCOPE_LABELS: Record<TrainingScope, { title: string; description: string }> = {
  single: {
    title: 'Solo esta instancia',
    description: 'Afecta únicamente el entrenamiento seleccionado (si no es histórico).',
  },
  future: {
    title: 'Esta y futuras instancias',
    description: 'Aplica desde este punto hacia adelante, sin tocar históricos.',
  },
  series: {
    title: 'Toda la serie',
    description: 'Cancela la serie y elimina solo entrenamientos no pasados.',
  },
};

export function EntrenamientoScopeModal({ open, action, allowedScopes, onClose, onConfirm }: EntrenamientoScopeModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar selector de alcance"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/70"
      />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-portal-border bg-navy-medium p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-100">Selecciona el alcance</h3>
        <p className="mt-1 text-sm text-slate-400">
          {action === 'delete'
            ? 'Elige cómo aplicar la eliminación respetando el histórico.'
            : 'Elige cómo aplicar la acción sobre entrenamientos recurrentes.'}
        </p>

        <div className="mt-4 space-y-2">
          {allowedScopes.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => onConfirm(scope)}
              className="w-full rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-3 text-left transition hover:border-turquoise/70"
            >
              <p className="text-sm font-semibold text-slate-100">{SCOPE_LABELS[scope].title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{SCOPE_LABELS[scope].description}</p>
            </button>
          ))}
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
