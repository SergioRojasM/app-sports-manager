import type { PerfilFormValues } from '@/types/portal/perfil.types';

type PerfilHeaderProps = {
  formValues: PerfilFormValues;
  fotoUrl: string | null;
  isDirty: boolean;
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
};

function getInitials(nombre: string, apellido: string): string {
  const first = nombre.trim().charAt(0).toUpperCase();
  const last = apellido.trim().charAt(0).toUpperCase();
  return (first + last) || '?';
}

export function PerfilHeader({
  formValues,
  fotoUrl,
  isDirty,
  isSubmitting,
  onSave,
  onCancel,
}: PerfilHeaderProps) {
  const initials = getInitials(formValues.nombre, formValues.apellido);
  const fullName =
    [formValues.nombre, formValues.apellido].filter(Boolean).join(' ') || 'Sin nombre';

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      {/* Avatar + info */}
      <div className="flex items-center gap-5">
        {/* Avatar frame */}
        <div className="relative shrink-0">
          {fotoUrl ? (
            <img
              src={fotoUrl}
              alt={fullName}
              className="h-20 w-20 rounded-xl object-cover ring-2 ring-portal-border"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-2xl font-bold text-white ring-2 ring-portal-border">
              {initials}
            </div>
          )}
          {/* Upload placeholder button */}
          <button
            type="button"
            disabled
            title="Próximamente"
            className="absolute -bottom-2 -right-2 flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-full bg-slate-700 text-slate-400 ring-2 ring-[#0f172a] transition hover:bg-slate-600"
            aria-label="Subir foto — Próximamente"
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span>
          </button>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Editar Perfil</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Actualiza tu información personal y preferencias.
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex shrink-0 gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={!isDirty}
          className="rounded-lg border border-portal-border px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSubmitting}
          className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? 'Guardando…' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
