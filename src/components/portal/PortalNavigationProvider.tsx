'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { usePortalNavigation, type UsePortalNavigationResult } from '@/hooks/portal/usePortalNavigation';

const PortalNavigationContext = createContext<UsePortalNavigationResult | null>(null);

/**
 * Runs usePortalNavigation once for the whole shell so the sidebar and the
 * mobile drawer share the tenant access / name lookups (US-0138).
 */
export function PortalNavigationProvider({ children }: { children: ReactNode }) {
  const navigation = usePortalNavigation();
  return <PortalNavigationContext.Provider value={navigation}>{children}</PortalNavigationContext.Provider>;
}

export function usePortalNavigationContext(): UsePortalNavigationResult {
  const context = useContext(PortalNavigationContext);
  if (!context) {
    throw new Error('usePortalNavigationContext must be used inside PortalNavigationProvider');
  }
  return context;
}
