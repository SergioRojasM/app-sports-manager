import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/services/supabase/server';

const ALLOWED_TYPES: EmailOtpType[] = ['invite'];
const FALLBACK_PATH = '/portal/orgs';

/** Accepts only a same-origin path from `redirect_to`, whether given as a path or an absolute URL. */
function resolveNextPath(redirectTo: string | null, requestOrigin: string): string {
  if (!redirectTo) return FALLBACK_PATH;
  try {
    const url = new URL(redirectTo, requestOrigin);
    const appUrl = process.env.APP_URL?.replace(/\/+$/, '');
    const trustedOrigins = new Set([requestOrigin, ...(appUrl ? [new URL(appUrl).origin] : [])]);
    if (!trustedOrigins.has(url.origin)) return FALLBACK_PATH;
    const path = `${url.pathname}${url.search}`;
    return path.startsWith('/') && !path.startsWith('//') ? path : FALLBACK_PATH;
  } catch {
    return FALLBACK_PATH;
  }
}

/**
 * Relative Location keeps the browser on the exact host the session cookie was just set for
 * (the dev server reports `localhost` even when the email link used 127.0.0.1).
 */
function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

/**
 * Landing route for the customized invite email: verifies the token hash server-side and
 * sets the session cookie, then sends the invitee to choose a password before accepting.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return redirectTo('/auth/login');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    return redirectTo('/auth/login?error=invitacion_invalida');
  }

  const nextPath = resolveNextPath(searchParams.get('redirect_to'), origin);
  return redirectTo(`/auth/update-password?next=${encodeURIComponent(nextPath)}`);
}
