// Notifications module (US-0125): in-app inbox + email outbox

/** One row of the user's in-app inbox (`public.notificaciones`). */
export type Notificacion = {
  id: string;
  usuarioId: string;
  tenantId: string | null;
  modulo: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  createdAt: string;
};

export type NotificacionesListado = {
  items: Notificacion[];
  total: number;
};

// ─── Email outbox (server only) ───

export type NotificacionOutboxEstado = 'pendiente' | 'procesando' | 'enviada' | 'error';

/** Row of `public.notificaciones_outbox` as claimed by the dispatcher. */
export type NotificacionOutboxRow = {
  id: string;
  tenant_id: string | null;
  modulo: string;
  tipo: string;
  destinatario_email: string;
  destinatario_usuario_id: string | null;
  entidad_tipo: string | null;
  entidad_id: string | null;
  payload: Record<string, unknown>;
  estado: NotificacionOutboxEstado;
  intentos: number;
};

export type NotificacionAdjunto = {
  filename: string;
  content: Buffer;
};

export type NotificacionEmail = {
  asunto: string;
  html: string;
  texto: string;
  adjuntos: NotificacionAdjunto[];
};

/** Renders the email of one outbox row. `null` = nothing to send (the entity no longer exists). */
export type NotificacionHandler = (row: NotificacionOutboxRow) => Promise<NotificacionEmail | null>;

export type DespachoResultado = {
  procesadas: number;
  enviadas: number;
  fallidas: number;
};
