import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { despacharNotificaciones } from '@/lib/notificaciones/despachador';
import { jsonNoStore, methodNotAllowed } from '@/lib/portal/privileged-route';

export const runtime = 'nodejs';
export const maxDuration = 60;

function tokenValido(header: string | null, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const recibido = Buffer.from(header.slice('Bearer '.length));
  const esperado = Buffer.from(secret);
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

/**
 * Notifications dispatcher (US-0125). Called by the database through pg_net — on outbox inserts and
 * every minute by pg_cron — with the bearer secret stored in Supabase Vault. No user session.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICACIONES_DISPATCH_SECRET;
  if (!secret) return jsonNoStore({ code: 'not_configured' }, 503);
  if (!tokenValido(request.headers.get('authorization'), secret)) {
    return jsonNoStore({ code: 'unauthorized' }, 401);
  }

  try {
    return jsonNoStore(await despacharNotificaciones(), 200);
  } catch (error) {
    console.error('[notificaciones] dispatch failed', error instanceof Error ? error.message : 'unknown_error');
    return jsonNoStore({ code: 'dispatch_failed' }, 500);
  }
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
