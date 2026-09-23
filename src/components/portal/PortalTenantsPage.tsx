'use client';

import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { TenantDirectoryList } from '@/components/portal/tenant/TenantDirectoryList';
import { InvitacionesPendientesSection } from '@/components/portal/invitaciones/InvitacionesPendientesSection';
import { GritPageHeader } from '@/components/ui';

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando organizaciones disponibles...
    </div>
  );
}

export function PortalTenantsPage() {
  const { tenants, loading, error, retry } = useTenantView({ mode: 'directory' });

  return (
    <section className="space-y-6">
      <GritPageHeader
        title="Organizaciones disponibles"
        subtitle="Explora las organizaciones y accede a aquellas donde ya tienes membresía activa."
      />

      <InvitacionesPendientesSection />

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
          <p className="text-sm text-grit-danger">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
            onClick={() => void retry()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!loading && !error ? <TenantDirectoryList organizations={tenants} /> : null}
    </section>
  );
}
