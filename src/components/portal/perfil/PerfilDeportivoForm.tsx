import type {
  PerfilFieldErrors,
  PerfilFormField,
  PerfilFormValues,
} from '@/types/portal/perfil.types';

type PerfilDeportivoFormProps = {
  formValues: PerfilFormValues;
  fieldErrors: PerfilFieldErrors;
  updateField: (field: PerfilFormField, value: string) => void;
};

const inputClass =
  'w-full rounded-xl border border-portal-border bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

export function PerfilDeportivoForm({
  formValues,
  fieldErrors,
  updateField,
}: PerfilDeportivoFormProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Perfil Deportivo
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Peso */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="peso_kg"
            className="text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Peso (kg)
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-500">
              monitor_weight
            </span>
            <input
              id="peso_kg"
              type="number"
              value={formValues.peso_kg}
              onChange={(e) => updateField('peso_kg', e.target.value)}
              placeholder="Ej: 70.50"
              step="0.01"
              min="0"
              max="999.99"
              className={inputClass}
            />
          </div>
          {fieldErrors.peso_kg && (
            <p className="text-xs text-red-400">{fieldErrors.peso_kg}</p>
          )}
        </div>

        {/* Altura */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="altura_cm"
            className="text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Altura (cm)
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-500">
              height
            </span>
            <input
              id="altura_cm"
              type="number"
              value={formValues.altura_cm}
              onChange={(e) => updateField('altura_cm', e.target.value)}
              placeholder="Ej: 175.00"
              step="0.01"
              min="0"
              max="999.99"
              className={inputClass}
            />
          </div>
          {fieldErrors.altura_cm && (
            <p className="text-xs text-red-400">{fieldErrors.altura_cm}</p>
          )}
        </div>
      </div>
    </section>
  );
}
