'use client';

import { useOrganizationView } from '@/hooks/portal/organization-view/useOrganizationView';
import { OrganizationIdentityCard } from './OrganizationIdentityCard';
import { OrganizationContactCard } from './OrganizationContactCard';

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

export function OrganizationInfoCards() {
  const { data, loading, error, retry } = useOrganizationView();

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
      <div className="flex justify-end">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex items-center gap-2 rounded-lg border border-portal-border bg-navy-medium/80 px-4 py-2 text-sm font-semibold text-slate-300 opacity-80"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
          Editar información
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <OrganizationIdentityCard identity={data.identity} />
        <div className="lg:col-span-2">
          <OrganizationContactCard contact={data.contact} social={data.social} />
        </div>
      </div>
    </div>
  );
}
