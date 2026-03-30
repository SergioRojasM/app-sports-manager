import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import type { TenantAccessDecision } from '@/types/portal/tenant.types';

/**
 * React cache()-wrapped version of tenantService.canUserAccessTenant.
 * Deduplicates the DB call within a single server request render tree,
 * so nested layouts (TenantLayout + route group layout) share one query.
 */
export const getCachedTenantAccess = cache(
  (
    supabase: SupabaseClient,
    userId: string,
    tenantId: string,
  ): Promise<TenantAccessDecision> => {
    return tenantService.canUserAccessTenant(supabase, userId, tenantId);
  },
);
