import {
  GritField,
  GritIcon,
  GritSwitch,
  gritDescribedBy,
  gritFileInputClass,
  gritInputClass,
  gritInputInvalidClass,
} from '@/components/ui';
import type {
  TenantEditFieldErrors,
  TenantEditFormValues,
} from '@/types/portal/tenant.types';

type LogoUploadState = {
  previewUrl: string | null;
  error: string | null;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type EditTenantFormProps = {
  values: TenantEditFormValues;
  errors: TenantEditFieldErrors;
  isSubmitting: boolean;
  onChange: (field: keyof TenantEditFormValues, value: string) => void;
  logoUpload?: LogoUploadState;
  bannerUpload?: LogoUploadState;
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
  { key: 'email', label: 'Correo', type: 'email', placeholder: 'club@qboptraining.com' },
  { key: 'telefono', label: 'Teléfono', type: 'tel', placeholder: '+57 300 000 0000' },
  { key: 'web_url', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
  { key: 'instagram_url', label: 'Instagram', type: 'url', placeholder: 'https://instagram.com/...' },
  { key: 'facebook_url', label: 'Facebook', type: 'url', placeholder: 'https://facebook.com/...' },
  { key: 'x_url', label: 'X', type: 'url', placeholder: 'https://x.com/...' },
];

const IMAGE_HINT = 'JPEG, PNG o WebP. Máximo 2 MB.';

export function EditTenantForm({ values, errors, isSubmitting, onChange, logoUpload, bannerUpload }: EditTenantFormProps) {
  const currentLogoSrc = logoUpload?.previewUrl ?? (values.logo_url || null);
  const currentBannerSrc = bannerUpload?.previewUrl ?? (values.banner_url || null);
  const isDisabled = isSubmitting || (logoUpload?.uploading ?? false) || (bannerUpload?.uploading ?? false);

  return (
    <div className="space-y-5">
      {logoUpload ? (
        <GritField htmlFor="logo-upload" label="Logo" hint={IMAGE_HINT} error={logoUpload.error}>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-white/[0.10] bg-white/[0.04]">
              {currentLogoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentLogoSrc} alt="Vista previa del logo" className="h-full w-full object-cover" />
              ) : (
                <GritIcon name="shield" size={22} className="text-grit-muted" />
              )}
            </div>
            <input
              id="logo-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={isDisabled}
              onChange={logoUpload.onFileSelect}
              aria-describedby={gritDescribedBy('logo-upload', IMAGE_HINT, logoUpload.error)}
              className={gritFileInputClass}
            />
          </div>
        </GritField>
      ) : null}

      {bannerUpload ? (
        <GritField htmlFor="banner-upload" label="Banner" hint={IMAGE_HINT} error={bannerUpload.error}>
          <div className="h-24 w-full overflow-hidden rounded-grit-lg border border-white/[0.10] bg-white/[0.04]">
            {currentBannerSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentBannerSrc} alt="Vista previa del banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <GritIcon name="panorama" size={22} className="text-grit-muted" />
              </div>
            )}
          </div>
          <input
            id="banner-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isDisabled}
            onChange={bannerUpload.onFileSelect}
            aria-describedby={gritDescribedBy('banner-upload', IMAGE_HINT, bannerUpload.error)}
            className={gritFileInputClass}
          />
        </GritField>
      ) : null}

      {FIELDS.map((field) => {
        const fieldError = errors[field.key];
        const common = {
          id: field.key,
          name: field.key,
          value: values[field.key],
          disabled: isDisabled,
          placeholder: field.placeholder,
          'aria-invalid': fieldError ? true : undefined,
          'aria-describedby': gritDescribedBy(field.key, undefined, fieldError),
          className: fieldError ? gritInputInvalidClass : gritInputClass,
        };

        return (
          <GritField key={field.key} htmlFor={field.key} label={field.label} error={fieldError}>
            {field.multiline ? (
              <textarea {...common} rows={4} onChange={(event) => onChange(field.key, event.target.value)} />
            ) : (
              <input {...common} type={field.type ?? 'text'} onChange={(event) => onChange(field.key, event.target.value)} />
            )}
          </GritField>
        );
      })}

      {/* publico — marketplace visibility (US-0133) */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-4">
        <GritSwitch
          id="publico"
          checked={values.publico === 'true'}
          onChange={(next) => onChange('publico', next ? 'true' : 'false')}
          disabled={isSubmitting}
          label="Organización pública"
          showLabel
          aria-describedby="publico-desc"
        />
        <p id="publico-desc" className="font-grit-body text-[11px] text-grit-muted">
          Cuando está activo, la organización aparece en «Organizaciones disponibles» y cualquier usuario puede solicitar
          acceso. Si lo desactivas, solo la verán sus miembros y no recibirá nuevas solicitudes.
        </p>
        {values.publico !== 'true' ? (
          <p className="font-grit-body text-xs text-grit-warning" role="status">
            Las solicitudes pendientes se conservan y puedes seguir gestionándolas. Para sumar miembros nuevos usa
            «Agregar miembro» en Gestión de equipo.
          </p>
        ) : null}
      </div>

      {/* max_solicitudes — numeric field */}
      <GritField
        htmlFor="max_solicitudes"
        label="Máximo de solicitudes rechazadas antes de bloqueo"
        error={errors.max_solicitudes}
      >
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
          aria-invalid={errors.max_solicitudes ? true : undefined}
          aria-describedby={gritDescribedBy('max_solicitudes', undefined, errors.max_solicitudes)}
          className={errors.max_solicitudes ? gritInputInvalidClass : gritInputClass}
        />
      </GritField>

      {/* requiere_perfil_completo — boolean toggle */}
      <div className="flex flex-col gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.025] p-4">
        <GritSwitch
          id="requiere_perfil_completo"
          checked={values.requiere_perfil_completo === 'true'}
          onChange={(next) => onChange('requiere_perfil_completo', next ? 'true' : 'false')}
          disabled={isSubmitting}
          label="Requerir perfil completo para ingresar a la organización"
          showLabel
          aria-describedby="requiere-perfil-desc"
        />
        <p id="requiere-perfil-desc" className="font-grit-body text-[11px] text-grit-muted">
          Cuando está activo, todos los miembros —incluidos los invitados y los que ya pertenecen a la organización—
          deberán completar su perfil (nombre, apellido, teléfono, fecha de nacimiento, tipo y número de
          identificación, fecha de expedición y grupo sanguíneo) para solicitar acceso e ingresar.
        </p>
      </div>
    </div>
  );
}
