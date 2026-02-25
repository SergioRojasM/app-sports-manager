'use client';

import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { TenantDirectoryList } from '@/components/portal/tenant/TenantDirectoryList';

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando organizaciones disponibles...
    </div>
  );
}

export function PortalTenantsPage() {
  const { tenants, loading, error, retry } = useTenantView({ mode: 'directory' });

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Organizaciones disponibles</h1>
        <p className="mt-2 text-sm text-slate-400">
          Explora las organizaciones y accede a aquellas donde ya tienes membresía activa.
        </p>
      </header>

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
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
