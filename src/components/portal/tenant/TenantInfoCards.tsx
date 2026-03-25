'use client';

import { useCallback, useEffect } from 'react';
import { useEditTenant } from '@/hooks/portal/tenant/useEditTenant';
import { useOrgLogoUpload } from '@/hooks/portal/tenant/useOrgLogoUpload';
import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { TenantIdentityCard } from './TenantIdentityCard';
import { TenantContactCard } from './TenantContactCard';
import { EditTenantDrawer } from './EditTenantDrawer';

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      No organization data is available for this account yet.
    </div>
  );
}

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
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

  const uploadLogoForTenant = useCallback(async () => {
    if (!logoUploadHook.selectedFile) return null;
    return logoUploadHook.upload(tenantId);
  }, [logoUploadHook, tenantId]);

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
      <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
        <p className="text-sm text-rose-200">{error}</p>
        <button
          type="button"
          className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
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
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void openDrawer()}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg border border-portal-border bg-navy-medium/80 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-navy-medium disabled:cursor-not-allowed disabled:opacity-60"
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
      />
    </div>
  );
}
