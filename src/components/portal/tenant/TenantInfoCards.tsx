'use client';

import { useCallback, useEffect } from 'react';
import { useEditTenant } from '@/hooks/portal/tenant/useEditTenant';
import { useOrgLogoUpload } from '@/hooks/portal/tenant/useOrgLogoUpload';
import { useOrgBannerUpload } from '@/hooks/portal/tenant/useOrgBannerUpload';
import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { TenantIdentityCard } from './TenantIdentityCard';
import { TenantContactCard } from './TenantContactCard';
import { EditTenantDrawer } from './EditTenantDrawer';

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      No organization data is available for this account yet.
    </div>
  );
}

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Loading organization information...
    </div>
  );
}

type TenantInfoCardsProps = {
  tenantId: string;
};

export function TenantInfoCards({ tenantId }: TenantInfoCardsProps) {
  const { data, loading, error, retry, refresh } = useTenantView({ tenantId });
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

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
        <p className="text-sm text-grit-danger">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
          onClick={() => void retry()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {successMessage ? (
        <div className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void openDrawer()}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-grit-md border border-grit-glass-border bg-grit-card px-4 py-2 text-sm font-semibold text-grit-text transition hover:bg-grit-card disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
          Editar organización
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TenantIdentityCard identity={data.identity} />
        <div className="lg:col-span-2">
          <TenantContactCard contact={data.contact} social={data.social} />
        </div>
      </div>

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
    </div>
  );
}
