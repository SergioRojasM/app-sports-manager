import 'server-only';
import { eventosHandlers } from '@/lib/notificaciones/modulos/eventos';
import { suscripcionesHandlers } from '@/lib/notificaciones/modulos/suscripciones';
import type { NotificacionHandler } from '@/types/portal/notificaciones.types';

/**
 * Email handlers by `modulo.tipo`. A module adds notifications by calling `_notificar_email` /
 * `_notificar_in_app` from its RPCs and registering its handlers here.
 */
const HANDLERS: Record<string, NotificacionHandler> = {
  ...eventosHandlers,
  ...suscripcionesHandlers,
};

export function resolverHandler(modulo: string, tipo: string): NotificacionHandler | null {
  return HANDLERS[`${modulo}.${tipo}`] ?? null;
}
