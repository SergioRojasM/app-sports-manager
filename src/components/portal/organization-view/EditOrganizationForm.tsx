import type {
  OrganizationEditFieldErrors,
  OrganizationEditFormValues,
} from '@/types/portal/organization-view.types';

type EditOrganizationFormProps = {
  values: OrganizationEditFormValues;
  errors: OrganizationEditFieldErrors;
  isSubmitting: boolean;
  onChange: (field: keyof OrganizationEditFormValues, value: string) => void;
};

type FieldConfig = {
  key: keyof OrganizationEditFormValues;
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

export function EditOrganizationForm({ values, errors, isSubmitting, onChange }: EditOrganizationFormProps) {
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
    </div>
  );
}
