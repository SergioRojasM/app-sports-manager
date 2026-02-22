'use server';

import { cookies } from 'next/headers';
import type { UserRole, PortalDisplayProfile } from '@/types/portal.types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/portal',
  maxAge: 60 * 60 * 24, // 24 hours
};

/**
 * Writes (or clears) the portal_role and portal_profile cookies.
 * Call after successful login with the resolved role + display profile.
 * Call with null on logout to remove both cookies.
 */
export async function setPortalCookies(
  role: UserRole | null,
  profile?: PortalDisplayProfile | null,
): Promise<void> {
  const cookieStore = await cookies();

  if (role === null) {
    // Clear both cookies
    cookieStore.set('portal_role', '', { ...COOKIE_OPTIONS, maxAge: 0 });
    cookieStore.set('portal_profile', '', { ...COOKIE_OPTIONS, maxAge: 0 });
    return;
  }

  cookieStore.set('portal_role', role, COOKIE_OPTIONS);

  if (profile) {
    const encoded = Buffer.from(JSON.stringify(profile)).toString('base64');
    cookieStore.set('portal_profile', encoded, COOKIE_OPTIONS);
  }
}
