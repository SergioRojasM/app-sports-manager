'use client';

import { useMemo, useState } from 'react';
import { matchesSearch } from '@/lib/text/normalize-search';
import type { PortalTenantListItem } from '@/types/portal/tenant.types';

export type TenantDirectoryFilterResult = {
  query: string;
  setQuery: (value: string) => void;
  /** Organizations where the user is a member ("Tus clubes"), sorted by name. */
  members: PortalTenantListItem[];
  /** Every other listed organization ("Explora clubes"), sorted by name. */
  explore: PortalTenantListItem[];
  /** False when the search matches no organization. */
  hasResults: boolean;
};

/** A member is a user whose membership has a role and whose access is allowed (same rule as before v3). */
export function isTenantMember(item: PortalTenantListItem): boolean {
  return Boolean(item.canAccess && item.userMembershipRole);
}

/** Pure split + filter used by the hook (exported for scratch checks). */
export function splitTenantDirectory(tenants: PortalTenantListItem[], query: string) {
  const matching = tenants
    .filter((item) => matchesSearch([item.identity.name, item.identity.description], query))
    .sort((left, right) => left.identity.name.localeCompare(right.identity.name, 'es'));

  return {
    members: matching.filter(isTenantMember),
    explore: matching.filter((item) => !isTenantMember(item)),
  };
}

/** Client-side search and member/explore split of the organization marketplace (frame `kMj4F`). */
export function useTenantDirectoryFilter(tenants: PortalTenantListItem[]): TenantDirectoryFilterResult {
  const [query, setQuery] = useState('');
  const { members, explore } = useMemo(() => splitTenantDirectory(tenants, query), [tenants, query]);

  return { query, setQuery, members, explore, hasResults: members.length + explore.length > 0 };
}
