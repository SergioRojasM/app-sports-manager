'use client';

import { GritAlert, GritButton, GritDrawer } from '@/components/ui';
import { EditTenantForm } from './EditTenantForm';
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

type EditTenantDrawerProps = {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  values: TenantEditFormValues;
  errors: TenantEditFieldErrors;
  submitError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof TenantEditFormValues, value: string) => void;
  logoUpload?: LogoUploadState;
  bannerUpload?: LogoUploadState;
};

/** Organization edit form in the kit drawer (DESIGN.md §9, `aYwNn` "Editar organización"). */
export function EditTenantDrawer({
  isOpen,
  isLoading,
  isSubmitting,
  values,
  errors,
  submitError,
  onClose,
  onSubmit,
  onChangeField,
  logoUpload,
  bannerUpload,
}: EditTenantDrawerProps) {
  return (
    <GritDrawer
      open={isOpen}
      onClose={onClose}
      busy={isSubmitting}
      size="lg"
      title="Editar organización"
      subtitle="Actualiza la información principal de tu organización."
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton
            icon="save"
            onClick={() => void onSubmit()}
            disabled={isLoading}
            loading={isSubmitting}
            loadingLabel="Guardando…"
          >
            Guardar cambios
          </GritButton>
        </>
      }
    >
      {isLoading ? (
        <p className="font-grit-body text-[13px] text-grit-subtext" role="status">
          Cargando información editable…
        </p>
      ) : (
        <EditTenantForm
          values={values}
          errors={errors}
          isSubmitting={isSubmitting}
          onChange={onChangeField}
          logoUpload={logoUpload}
          bannerUpload={bannerUpload}
        />
      )}

      {submitError ? (
        <GritAlert tone="danger" className="mt-4">
          {submitError}
        </GritAlert>
      ) : null}
    </GritDrawer>
  );
}
