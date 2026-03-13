import type {
  TenantEditFieldErrors,
  TenantEditFormValues,
} from '@/types/portal/tenant.types';

type EditTenantFormProps = {
  values: TenantEditFormValues;
  errors: TenantEditFieldErrors;
  isSubmitting: boolean;
  onChange: (field: keyof TenantEditFormValues, value: string) => void;
};

type FieldConfig = {
  key: keyof TenantEditFormValues;
  label: string;
  type?: 'text' | 'email' | 'url' | 'tel';
  placeholder?: string;
  multiline?: boolean;
};

const FIELDS: FieldConfig[] = [
  { key: 'nombre', label: 'Nombre', placeholder: 'Qbop Training Club' },
  {
    key: 'descripcion',
    label: 'Descripción',
    placeholder: 'Describe brevemente la organización',
    multiline: true,
  },
  { key: 'logo_url', label: 'Logo URL', type: 'url', placeholder: 'https://...' },
  { key: 'email', label: 'Correo', type: 'email', placeholder: 'club@qboptraining.com' },
  { key: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000' },
  { key: 'web_url', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
  { key: 'instagram_url', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...' },
  { key: 'facebook_url', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/...' },
  { key: 'x_url', label: 'X', type: 'url', placeholder: 'https://x.com/...' },
];

export function EditTenantForm({ values, errors, isSubmitting, onChange }: EditTenantFormProps) {
  const maxSolicitudesError = errors.max_solicitudes;
  const maxSolicitudesInputClass = `w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:ring-2 ${
    maxSolicitudesError
      ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
      : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35'
  }`;

  return (
    <div className="space-y-4">
      {FIELDS.map((field) => {
        const fieldError = errors[field.key];
        const inputClassName = `w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:ring-2 ${
          fieldError
            ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
            : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35'
        }`;

        return (
          <div key={field.key} className="space-y-1.5">
            <label htmlFor={field.key} className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {field.label}
            </label>

            {field.multiline ? (
              <textarea
                id={field.key}
                name={field.key}
                rows={4}
                value={values[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                disabled={isSubmitting}
                placeholder={field.placeholder}
                className={inputClassName}
              />
            ) : (
              <input
                id={field.key}
                name={field.key}
                type={field.type ?? 'text'}
                value={values[field.key]}
                onChange={(event) => onChange(field.key, event.target.value)}
                disabled={isSubmitting}
                placeholder={field.placeholder}
                className={inputClassName}
              />
            )}

            {fieldError ? (
              <p className="text-xs font-medium text-rose-300" role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
        );
      })}

      {/* max_solicitudes — numeric field */}
      <div className="space-y-1.5">
        <label htmlFor="max_solicitudes" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          Máximo de solicitudes rechazadas antes de bloqueo
        </label>
        <input
          id="max_solicitudes"
          name="max_solicitudes"
          type="number"
          min={1}
          max={10}
          step={1}
          value={values.max_solicitudes}
          onChange={(event) => onChange('max_solicitudes', event.target.value)}
          disabled={isSubmitting}
          placeholder="2"
          className={maxSolicitudesInputClass}
        />
        {maxSolicitudesError ? (
          <p className="text-xs font-medium text-rose-300" role="alert">
            {maxSolicitudesError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
