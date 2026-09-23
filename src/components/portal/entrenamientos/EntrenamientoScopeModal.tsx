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
    title: 'Este y futuros entrenamientos de la serie',
    description: 'Cancela y elimina este entrenamiento y todos los futuros de la serie.',
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
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-lg rounded-grit-2xl border border-grit-glass-border bg-grit-card p-5 shadow-xl">
        <h3 className="font-grit-title text-lg font-semibold text-grit-text">Selecciona el alcance</h3>
        <p className="mt-1 text-sm text-grit-subtext">
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
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-3 text-left transition hover:border-grit-cyan/70"
            >
              <p className="text-sm font-semibold text-grit-text">{SCOPE_LABELS[scope].title}</p>
              <p className="mt-0.5 text-xs text-grit-subtext">{SCOPE_LABELS[scope].description}</p>
            </button>
          ))}
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
