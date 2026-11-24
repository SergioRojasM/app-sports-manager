'use client';

import type { ReactNode } from 'react';
import { useTenantView } from '@/hooks/portal/tenant/useTenantView';
import { useTenantDirectoryFilter } from '@/hooks/portal/tenant/useTenantDirectoryFilter';
import { ClubExploreCard } from '@/components/portal/tenant/ClubExploreCard';
import { ClubMemberCard } from '@/components/portal/tenant/ClubMemberCard';
import { InvitacionesPendientesSection } from '@/components/portal/invitaciones/InvitacionesPendientesSection';
import { GritButton, GritEmptyState, GritPageHeader, GritSearchField } from '@/components/ui';

function MarketplaceSection({ id, title, count, children }: { id: string; title: string; count: number; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="flex items-center gap-2 font-grit-body text-base font-medium text-grit-text">
        {title}
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-grit-body text-[11px] font-semibold text-grit-subtext">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/** Organization marketplace `/portal/orgs` (grit-arena-v3 frame `kMj4F`). */
export function PortalTenantsPage() {
  const { tenants, loading, error, retry } = useTenantView({ mode: 'directory' });
  const { query, setQuery, members, explore, hasResults } = useTenantDirectoryFilter(tenants);
  const ready = !loading && !error;

  return (
    <div className="flex flex-col gap-5">
      <GritPageHeader
        title="Encuentra tu"
        titleAccent="club."
        actions={
          <GritSearchField
            size="lg"
            aria-label="Buscar club o disciplina"
            placeholder="Buscar club o disciplina"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full sm:w-[320px]"
          />
        }
      />

      <InvitacionesPendientesSection />

      {loading ? <GritEmptyState icon="hourglass_top" title="Cargando organizaciones…" /> : null}

      {!loading && error ? (
        <GritEmptyState
          icon="error"
          title="No se pudieron cargar las organizaciones"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={() => void retry()}>
              Reintentar
            </GritButton>
          }
        />
      ) : null}

      {ready && tenants.length === 0 ? <GritEmptyState icon="shield" title="No hay organizaciones disponibles por ahora." /> : null}

      {ready && tenants.length > 0 && !hasResults ? (
        <GritEmptyState
          icon="search_off"
          title={`No encontramos clubes con «${query.trim()}»`}
          action={
            <GritButton variant="secondary" size="sm" icon="close" onClick={() => setQuery('')}>
              Limpiar búsqueda
            </GritButton>
          }
        />
      ) : null}

      {ready && members.length > 0 ? (
        <MarketplaceSection id="tus-clubes-titulo" title="Tus clubes" count={members.length}>
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {members.map((organization) => (
              <li key={organization.identity.tenantId}>
                <ClubMemberCard organization={organization} />
              </li>
            ))}
          </ul>
        </MarketplaceSection>
      ) : null}

      {ready && explore.length > 0 ? (
        <MarketplaceSection id="explora-clubes-titulo" title="Explora clubes" count={explore.length}>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {explore.map((organization) => (
              <li key={organization.identity.tenantId}>
                <ClubExploreCard organization={organization} />
              </li>
            ))}
          </ul>
        </MarketplaceSection>
      ) : null}
    </div>
  );
}
