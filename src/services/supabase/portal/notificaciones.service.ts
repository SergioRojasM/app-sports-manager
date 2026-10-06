import { createClient } from '@/services/supabase/client';
import type { Notificacion, NotificacionesListado } from '@/types/portal/notificaciones.types';

const COLUMNS = 'id, usuario_id, tenant_id, modulo, tipo, titulo, mensaje, url, leida, created_at';

type NotificacionRow = {
  id: string;
  usuario_id: string;
  tenant_id: string | null;
  modulo: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  created_at: string;
};

function toNotificacion(row: NotificacionRow): Notificacion {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    tenantId: row.tenant_id,
    modulo: row.modulo,
    tipo: row.tipo,
    titulo: row.titulo,
    mensaje: row.mensaje,
    url: row.url,
    leida: Boolean(row.leida),
    createdAt: row.created_at,
  };
}

/**
 * In-app inbox of the signed-in user (US-0125). RLS returns own rows only; writes go through the
 * mark-as-read RPCs.
 */
export const notificacionesService = {
  /** Id of the signed-in user, or `null` without a session. */
  async getUsuarioId(): Promise<string | null> {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  },

  async listar({ limit, offset }: { limit: number; offset: number }): Promise<NotificacionesListado> {
    const supabase = createClient();
    const { data, error, count } = await supabase
      .from('notificaciones')
      .select(COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { items: ((data ?? []) as NotificacionRow[]).map(toNotificacion), total: count ?? 0 };
  },

  async contarNoLeidas(): Promise<number> {
    const supabase = createClient();
    const { error, count } = await supabase
      .from('notificaciones')
      .select('id', { count: 'exact', head: true })
      .eq('leida', false);

    if (error) throw new Error(error.message);
    return count ?? 0;
  },

  async marcarLeida(id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc('marcar_notificacion_leida', { p_id: id });
    if (error) throw new Error(error.message);
  },

  async marcarTodasLeidas(): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase.rpc('marcar_notificaciones_leidas');
    if (error) throw new Error(error.message);
  },

  /**
   * Realtime inserts of the user's notifications. Events missed while the socket was down are not
   * replayed, so `onReconnect` tells the caller to reload. Returns the unsubscribe function.
   */
  suscribir(usuarioId: string, onInsert: (notificacion: Notificacion) => void, onReconnect: () => void): () => void {
    const supabase = createClient();
    let suscrito = false;

    const channel = supabase
      .channel(`notificaciones:${usuarioId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${usuarioId}` },
        (payload) => onInsert(toNotificacion(payload.new as NotificacionRow)),
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        if (suscrito) onReconnect();
        suscrito = true;
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
