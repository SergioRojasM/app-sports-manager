'use client';

import { useCallback, useEffect } from 'react';
import { GritAlert, GritButton, GritPageHeader } from '@/components/ui';
import { useEditTenant } from '@/hooks/portal/tenant/useEditTenant';
import { useOrgBannerUpload } from '@/hooks/portal/tenant/useOrgBannerUpload';
import { useOrgLogoUpload } from '@/hooks/portal/tenant/useOrgLogoUpload';
import { useTenantMiembrosCount } from '@/hooks/portal/tenant/useTenantMiembrosCount';
import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { EditTenantDrawer } from './EditTenantDrawer';
import { TenantInfoCards } from './TenantInfoCards';
import { TenantPaymentMethodsCard } from './TenantPaymentMethodsCard';
import { TenantReglasNotificacionCard } from './TenantReglasNotificacionCard';
import { TenantReglasSuspensionCard } from './TenantReglasSuspensionCard';

type GestionOrganizacionPageProps = {
  tenantId: string;
};

/**
 * Organization settings (`aYwNn` Admin · Configuración): header, identity + contact row,
 * payment methods + suspension rules row, and automatic notifications. Each section loads
 * and fails on its own.
 */
export function GestionOrganizacionPage({ tenantId }: GestionOrganizacionPageProps) {
  const { data, loading, error, retry, refresh } = useTenantView({ tenantId });
  const { count: miembros } = useTenantMiembrosCount(tenantId);
  const logoUploadHook = useOrgLogoUpload();
  const bannerUploadHook = useOrgBannerUpload();

  const uploadLogoForTenant = useCallback(async () => {
    if (!logoUploadHook.selectedFile) return null;
    return logoUploadHook.upload(tenantId);
  }, [logoUploadHook, tenantId]);

  const uploadBannerForTenant = useCallback(async () => {
    if (!bannerUploadHook.selectedFile) return null;
    return bannerUploadHook.upload(tenantId);
  }, [bannerUploadHook, tenantId]);

  const {
    isDrawerOpen,
    isInitialLoading,
    isSubmitting,
    values,
    fieldErrors,
    submitError,
    successMessage,
    openDrawer,
    closeDrawer,
    updateField,
    submit,
  } = useEditTenant({
    tenantId,
    onSaved: refresh,
    uploadLogo: logoUploadHook.selectedFile ? uploadLogoForTenant : undefined,
    uploadBanner: bannerUploadHook.selectedFile ? uploadBannerForTenant : undefined,
  });

  useEffect(() => {
    if (!data && isDrawerOpen) {
      closeDrawer();
    }
  }, [closeDrawer, data, isDrawerOpen]);

  const openEdit = () => void openDrawer();

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Tu"
        titleAccent="organización."
        italic
        actions={
          <GritButton icon="edit" onClick={openEdit} disabled={!data || isSubmitting}>
            Editar organización
          </GritButton>
        }
      />

      {successMessage ? <GritAlert tone="success">{successMessage}</GritAlert> : null}

      <TenantInfoCards
        data={data}
        loading={loading}
        error={error}
        onRetry={() => void retry()}
        miembros={miembros}
        onEdit={openEdit}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <TenantPaymentMethodsCard tenantId={tenantId} />
        <TenantReglasSuspensionCard tenantId={tenantId} />
      </div>

      <TenantReglasNotificacionCard tenantId={tenantId} />

      <EditTenantDrawer
        isOpen={isDrawerOpen}
        isLoading={isInitialLoading}
        isSubmitting={isSubmitting}
        values={values}
        errors={fieldErrors}
        submitError={submitError}
        onClose={closeDrawer}
        onSubmit={submit}
        onChangeField={updateField}
        logoUpload={{
          previewUrl: logoUploadHook.previewUrl,
          error: logoUploadHook.error,
          uploading: logoUploadHook.uploading,
          onFileSelect: logoUploadHook.handleFileSelect,
        }}
        bannerUpload={{
          previewUrl: bannerUploadHook.previewUrl,
          error: bannerUploadHook.error,
          uploading: bannerUploadHook.uploading,
          onFileSelect: bannerUploadHook.handleFileSelect,
        }}
      />
    </section>
  );
}
