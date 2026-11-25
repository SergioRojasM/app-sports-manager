import 'server-only';
import { NextResponse } from 'next/server';
import type { InvitacionesErrorCode } from '@/types/portal/invitaciones.types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function jsonNoStore<T>(body: T, status: number): NextResponse<T> {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function errorResponse(code: InvitacionesErrorCode, status: number) {
  return jsonNoStore({ code }, status);
}

export function methodNotAllowed() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function optionalTrimmedString(value: unknown, maxLength: number): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length > maxLength) return null;
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Trusted application origin for Auth email links. Never derived from request headers. */
export function getAppUrl(): string {
  const appUrl = process.env.APP_URL?.replace(/\/+$/, '');
  if (!appUrl) {
    throw new Error('APP_URL is not configured');
  }
  return appUrl;
}

/**
 * Where the invite email should land after `/auth/confirm` verifies the token. The invite
 * email template links to `/auth/confirm?token_hash=…&type=invite&redirect_to={{ .RedirectTo }}`.
 */
export function buildInvitacionRedirectTo(invitacionId: string): string {
  return `${getAppUrl()}/portal/invitaciones/${invitacionId}`;
}

/** True when Supabase Auth rejected an admin call because the email already has an account. */
export function isEmailAlreadyRegistered(error: { code?: string; status?: number; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return true;
  return /already (been )?registered|already exists/i.test(error.message ?? '');
}
