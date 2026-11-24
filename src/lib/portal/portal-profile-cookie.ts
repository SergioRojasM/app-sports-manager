import { cookies } from 'next/headers';
import type { PortalDisplayProfile } from '@/types/portal.types';

/** Decodes the `portal_profile` cookie value (base64 JSON written by `/portal/bootstrap`). */
export function parsePortalProfileName(raw: string | undefined): string {
  if (!raw) return '';
  try {
    const profile = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as Partial<PortalDisplayProfile>;
    if (typeof profile.nombre !== 'string') return '';
    const first = profile.nombre.trim().split(/\s+/)[0] ?? '';
    // Profiles are sometimes stored in capitals ("RODOLFO"): display them as a name.
    return first === first.toUpperCase() ? first.charAt(0) + first.slice(1).toLowerCase() : first;
  } catch {
    return '';
  }
}

/** First name of the signed-in user from the `portal_profile` cookie — no DB call; '' when unavailable. */
export async function readPortalProfileName(): Promise<string> {
  const cookieStore = await cookies();
  return parsePortalProfileName(cookieStore.get('portal_profile')?.value);
}
