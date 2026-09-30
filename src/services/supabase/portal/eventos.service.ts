import { createClient } from '@/services/supabase/client';
import {
  EVENTO_ESTADOS,
  EventoServiceError,
  type Evento,
  type EventoCompleto,
  type EventoEntradaConCupones,
  type EventoEstado,
  type EventoListItem,
  type EventoPublicoDetalle,
  type EventoPublicoListItem,
  type EventosListFilters,
  type GuardarEventoPayload,
  type GuardarEventoResult,
} from '@/types/portal/eventos.types';

type PostgrestErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
} | null;

const FORBIDDEN_MESSAGE = 'No tienes permisos para gestionar este evento.';
const INVALID_DATA_MESSAGE = 'Los datos del evento no son válidos.';

/** Messages for the codes `guardar_evento_completo` raises as exception text (US-0119). */
const RPC_INVALID_DATA_MESSAGES: Record<string, string> = {
  NOMBRE_REQUERIDO: 'Escribe el nombre del evento.',
  DISCIPLINA_REQUERIDA: 'Selecciona la disciplina del evento.',
  ENTRADAS_REQUERIDAS: 'Agrega al menos una entrada.',
  ENTRADA_INCOMPLETA: 'Todas las entradas deben tener nombre y valor.',
  BUNDLE_REQUERIDO: 'Las entradas múltiples deben incluir al menos un evento.',
  CUPON_INCOMPLETO: 'Todos los cupones deben tener nombre, código y descuento.',
  CUPON_EN_ENTRADA_GRATIS: 'Las entradas gratuitas no admiten cupones.',
  METODO_PAGO_REQUERIDO: 'Selecciona al menos un método de pago para las entradas con costo.',
  FORMULARIO_INACTIVO: 'El formulario seleccionado está inactivo.',
  NO_REVERTIR_A_BORRADOR: 'Un evento publicado no puede volver a borrador.',
};

function forbiddenError(): EventoServiceError {
  return new EventoServiceError('forbidden', FORBIDDEN_MESSAGE);
}

function mapServiceError(error: PostgrestErrorLike): EventoServiceError {
  const message = error?.message ?? '';

  // PGRST116 on a write means RLS filtered the row out, so .single() saw zero rows
  if (error?.code === '42501' || error?.code === 'PGRST116') {
    return forbiddenError();
  }

  if (error?.code === 'P0002') {
    return new EventoServiceError('not_found', 'El evento ya no existe.');
  }

  if (error?.code === '23505') {
    if (message.includes('uq_evento_entrada_cupones_codigo')) {
      return new EventoServiceError('duplicate_cupon', 'El código de cupón ya está en uso en este evento.');
    }
    if (message.includes('uq_evento_entradas_nombre')) {
      return new EventoServiceError('duplicate_entrada', 'Ya existe una entrada con ese nombre en el evento.');
    }
    return new EventoServiceError('invalid_data', INVALID_DATA_MESSAGE);
  }

  if (error?.code === '23503') {
    if (message.includes('FORMULARIO_INVALIDO')) {
      return new EventoServiceError('invalid_reference', 'El formulario seleccionado no existe o está inactivo.');
    }
    if (message.includes('BUNDLE_INVALIDO')) {
      return new EventoServiceError('invalid_reference', 'Uno de los eventos del paquete ya no existe.');
    }
    if (message.includes('TENANT_INVALIDO')) {
      return new EventoServiceError('invalid_reference', 'La organización del evento no existe.');
    }
    return new EventoServiceError('invalid_reference', 'Una referencia del evento no es válida.');
  }

  if (error?.code === '23514') {
    const code = Object.keys(RPC_INVALID_DATA_MESSAGES).find((key) => message.includes(key));
    return new EventoServiceError('invalid_data', code ? RPC_INVALID_DATA_MESSAGES[code] : INVALID_DATA_MESSAGE);
  }

  return new EventoServiceError('unknown', 'No se pudo completar la operación. Intenta de nuevo.');
}

function toListItem(row: Evento): EventoListItem {
  const entrenadores = Array.isArray(row.entrenador_id) ? row.entrenador_id : [];
  const entrenadorNombre = entrenadores
    .map((entrenador) => entrenador.nombre?.trim())
    .filter(Boolean)
    .join(', ');

  return {
    id: row.id,
    tenantId: row.tenant_id,
    nombre: row.nombre ?? 'Evento sin nombre',
    descripcion: row.descripcion,
    disciplinaNombre: row.disciplina_id,
    escenarioNombre: row.escenario_id?.nombre ?? null,
    entrenadorNombre: entrenadorNombre || null,
    fechaHora: row.fecha_hora,
    duracionMinutos: row.duracion_minutos,
    cupoMaximo: row.cupo_maximo,
    puntoEncuentro: row.punto_encuentro,
    estado: row.estado,
    precio: row.precio ?? [],
    bannerUrl: row.banner_url,
    activo: row.activo,
    publico: row.publico,
    borrador: row.borrador,
  };
}

/**
 * Columns for the cross-tenant discovery pages (US-0120). `metodos_pago` is public content the admin
 * chose to publish; `formulario_id`, `creado_por` and `omitir_confirmacion_compra` are internal and
 * never requested here.
 */
const EVENTOS_PUBLICOS_LIST_SELECT =
  'id, tenant_id, nombre_tenant, nombre, descripcion, pagina_evento_url, disciplina_id, ' +
  'escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, ' +
  'reserva_antelacion_horas, precio, metodos_pago, banner_url, publico';

const EVENTO_PUBLICO_DETALLE_SELECT =
  `${EVENTOS_PUBLICOS_LIST_SELECT}, descripcion_larga, cronograma, incluye, cancelacion_antelacion_horas`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Discovery pages cap the listing; filtering happens client-side below this size. */
export const EVENTOS_PUBLICOS_LIMIT = 500;

type EventoPublicoRow = Pick<
  Evento,
  | 'id'
  | 'tenant_id'
  | 'nombre_tenant'
  | 'nombre'
  | 'descripcion'
  | 'pagina_evento_url'
  | 'disciplina_id'
  | 'escenario_id'
  | 'entrenador_id'
  | 'fecha_hora'
  | 'duracion_minutos'
  | 'cupo_maximo'
  | 'punto_encuentro'
  | 'reserva_antelacion_horas'
  | 'precio'
  | 'metodos_pago'
  | 'banner_url'
  | 'publico'
>;

type EventoPublicoDetalleRow = EventoPublicoRow &
  Pick<Evento, 'descripcion_larga' | 'cronograma' | 'incluye' | 'cancelacion_antelacion_horas'>;

/**
 * Explicit visibility filters for the discovery pages. RLS alone is not enough: it lets a tenant's
 * admins/trainers read their own drafts and inactive rows, and members read private rows.
 */
function publicadosQuery(select: string, soloPublicos: boolean) {
  const supabase = createClient();
  let query = supabase
    .from('eventos')
    .select(select)
    .eq('activo', true)
    .eq('borrador', false)
    .eq('estado', 'confirmado')
    .or(`fecha_hora.gte.${new Date().toISOString()},fecha_hora.is.null`);

  if (soloPublicos) query = query.eq('publico', true);

  return query;
}

function toPublicoListItem(row: EventoPublicoRow): EventoPublicoListItem {
  const entrenadores = Array.isArray(row.entrenador_id) ? row.entrenador_id : [];
  const entrenadorNombre = entrenadores
    .map((entrenador) => entrenador.nombre?.trim())
    .filter(Boolean)
    .join(', ');

  return {
    id: row.id,
    tenantId: row.tenant_id,
    nombreTenant: row.nombre_tenant ?? '',
    nombre: row.nombre ?? 'Evento',
    descripcion: row.descripcion,
    paginaEventoUrl: row.pagina_evento_url,
    disciplinaNombre: row.disciplina_id ?? 'Evento',
    escenario: row.escenario_id ?? null,
    escenarioNombre: row.escenario_id?.nombre ?? null,
    escenarioUbicacion: row.escenario_id?.ubicacion ?? row.escenario_id?.direccion ?? null,
    puntoEncuentro: row.punto_encuentro,
    entrenadores,
    entrenadorNombre: entrenadorNombre || null,
    fechaHora: row.fecha_hora,
    duracionMinutos: row.duracion_minutos,
    cupoMaximo: row.cupo_maximo,
    reservaAntelacionHoras: row.reserva_antelacion_horas,
    precio: Array.isArray(row.precio) ? row.precio : [],
    metodosPago: Array.isArray(row.metodos_pago) ? row.metodos_pago : [],
    bannerUrl: row.banner_url,
    publico: row.publico,
  };
}

function toPublicoDetalle(row: EventoPublicoDetalleRow): EventoPublicoDetalle {
  return {
    ...toPublicoListItem(row),
    descripcionLarga: row.descripcion_larga,
    cronograma: Array.isArray(row.cronograma) ? row.cronograma : [],
    incluye: Array.isArray(row.incluye) ? row.incluye : [],
    cancelacionAntelacionHoras: row.cancelacion_antelacion_horas,
  };
}

type RpcResult = {
  evento_id: string;
  borrador: boolean;
  entradas: { client_key: string; id: string; cupones: { client_key: string; id: string }[] }[];
};

/** `numeric` columns come back from PostgREST as numbers; coerce defensively in case a string slips through. */
function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeEntradas(entradas: EventoEntradaConCupones[] | null | undefined): EventoEntradaConCupones[] {
  return (entradas ?? [])
    .map((entrada) => ({
      ...entrada,
      valor: toNumberOrNull(entrada.valor),
      eventos_id_bundle: Array.isArray(entrada.eventos_id_bundle) ? entrada.eventos_id_bundle : [],
      cupones: (entrada.cupones ?? [])
        .map((cupon) => ({ ...cupon, descuento: toNumberOrNull(cupon.descuento) }))
        .sort((left, right) => left.created_at.localeCompare(right.created_at)),
    }))
    .sort((left, right) => left.orden - right.orden || left.created_at.localeCompare(right.created_at));
}

export const eventosService = {
  /**
   * Cross-tenant discovery listing (US-0120). `soloPublicos` is always true on the anonymous
   * landing surfaces, even when the browser has a session.
   */
  async listEventosPublicados(options: { soloPublicos: boolean }): Promise<EventoPublicoListItem[]> {
    const { data, error } = await publicadosQuery(EVENTOS_PUBLICOS_LIST_SELECT, options.soloPublicos)
      .order('fecha_hora', { ascending: true, nullsFirst: false })
      .limit(EVENTOS_PUBLICOS_LIMIT);

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as unknown as EventoPublicoRow[]).map(toPublicoListItem);
  },

  /** One event for the detail pages; null when it does not exist or is not visible there (US-0120). */
  async getEventoPublicado(eventoId: string, options: { soloPublicos: boolean }): Promise<EventoPublicoDetalle | null> {
    // A malformed id can never match; skip the request (PostgREST would answer 400 / 22P02)
    if (!UUID_RE.test(eventoId)) return null;

    const { data, error } = await publicadosQuery(EVENTO_PUBLICO_DETALLE_SELECT, options.soloPublicos)
      .eq('id', eventoId)
      .maybeSingle();

    if (error) {
      // A malformed id is "not found" from the visitor's point of view
      if (error.code === '22P02') return null;
      throw mapServiceError(error);
    }

    return data ? toPublicoDetalle(data as unknown as EventoPublicoDetalleRow) : null;
  },

  async listEventos(tenantId: string, filters: EventosListFilters = {}): Promise<EventoListItem[]> {
    const supabase = createClient();

    // Disciplina, escenario and entrenadores are snapshots on the row itself (US-0119), so no embeds are needed
    let query = supabase.from('eventos').select('*').eq('tenant_id', tenantId);

    if (filters.desde) query = query.gte('fecha_hora', filters.desde);
    if (filters.hasta) query = query.lt('fecha_hora', filters.hasta);

    const { data, error } = await query.order('fecha_hora', { ascending: true, nullsFirst: false });

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as Evento[]).map(toListItem);
  },

  async getEventoById(tenantId: string, eventoId: string): Promise<Evento | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .maybeSingle();

    if (error) {
      throw mapServiceError(error);
    }

    return (data as Evento | null) ?? null;
  },

  /** The event with its tickets (by `orden`) and each ticket's coupons, for the edit wizard. */
  async getEventoCompleto(tenantId: string, eventoId: string): Promise<EventoCompleto | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .select('*, entradas:evento_entradas(*, cupones:evento_entrada_cupones(*))')
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .maybeSingle();

    if (error) {
      // A malformed id is "not found" from the caller's point of view
      if (error.code === '22P02') return null;
      throw mapServiceError(error);
    }

    if (!data) return null;

    const row = data as EventoCompleto;
    return { ...row, entradas: normalizeEntradas(row.entradas) };
  },

  /**
   * Atomic save of the event, its tickets and coupons through `guardar_evento_completo`.
   * `borrador: true` validates only the name and format; `false` enforces completeness and publishes.
   */
  async guardarEventoCompleto(
    tenantId: string,
    eventoId: string,
    payload: GuardarEventoPayload,
    options: { esNuevo: boolean; borrador: boolean },
  ): Promise<GuardarEventoResult> {
    const supabase = createClient();

    const { data, error } = await supabase.rpc('guardar_evento_completo', {
      p_tenant_id: tenantId,
      p_evento_id: eventoId,
      p_es_nuevo: options.esNuevo,
      p_borrador: options.borrador,
      p_evento: payload.evento,
      p_entradas: payload.entradas,
    });

    if (error) {
      throw mapServiceError(error);
    }

    const result = data as RpcResult;
    return {
      eventoId: result.evento_id,
      borrador: result.borrador,
      entradas: (result.entradas ?? []).map((entrada) => ({
        clientKey: entrada.client_key,
        id: entrada.id,
        cupones: (entrada.cupones ?? []).map((cupon) => ({ clientKey: cupon.client_key, id: cupon.id })),
      })),
    };
  },

  async updateEstadoEvento(tenantId: string, eventoId: string, estado: EventoEstado): Promise<Evento> {
    if (!EVENTO_ESTADOS.includes(estado)) {
      throw new EventoServiceError('invalid_data', INVALID_DATA_MESSAGE);
    }

    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .update({ estado })
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .select('*')
      .single();

    if (error) {
      throw mapServiceError(error);
    }

    return data as Evento;
  },

  /** Quick hide/show from the management page: `activo = false` hides the event from members and visitors. */
  async updateActivoEvento(tenantId: string, eventoId: string, activo: boolean): Promise<Evento> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .update({ activo })
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .select('*')
      .single();

    if (error) {
      throw mapServiceError(error);
    }

    return data as Evento;
  },

  async deleteEvento(tenantId: string, eventoId: string): Promise<void> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .select('id');

    if (error) {
      throw mapServiceError(error);
    }

    // RLS silently filters deletes; zero rows back means the caller had no permission
    if (!data || data.length === 0) {
      throw forbiddenError();
    }
  },
};
