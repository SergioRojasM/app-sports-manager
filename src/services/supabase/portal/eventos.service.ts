import { createClient } from '@/services/supabase/client';
import {
  EVENTO_ESTADOS,
  EventoServiceError,
  type Evento,
  type EventoEstado,
  type EventoInput,
  type EventoListItem,
  type EventosListFilters,
} from '@/types/portal/eventos.types';

type PostgrestErrorLike = {
  code?: string;
  message?: string;
} | null;

const FORBIDDEN_MESSAGE = 'No tienes permisos para gestionar este evento.';

function forbiddenError(): EventoServiceError {
  return new EventoServiceError('forbidden', FORBIDDEN_MESSAGE);
}

function mapServiceError(error: PostgrestErrorLike): EventoServiceError {
  // PGRST116 on a write means RLS filtered the row out, so .single() saw zero rows
  if (error?.code === '42501' || error?.code === 'PGRST116') {
    return forbiddenError();
  }

  if (error?.code === '23503') {
    return new EventoServiceError('invalid_reference', 'La disciplina, escenario o entrenador seleccionado no existe.');
  }

  if (error?.code === '23514') {
    return new EventoServiceError('invalid_data', 'Los datos del evento no son válidos.');
  }

  return new EventoServiceError('unknown', 'No se pudo completar la operación. Intenta de nuevo.');
}

function toNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

type NamedRef = { id: string; nombre: string | null } | null;
type EntrenadorRef = { id: string; nombre: string | null; apellido: string | null } | null;

type EventoListRow = Evento & {
  disciplina: NamedRef;
  escenario: NamedRef;
  entrenador: EntrenadorRef;
};

/**
 * `eventos` has two FKs into `usuarios` (`entrenador_id`, `creado_por`), so the
 * trainer embed MUST name its constraint or PostgREST rejects the query as ambiguous.
 */
const LIST_SELECT =
  '*, disciplina:disciplinas(id, nombre), escenario:escenarios(id, nombre), entrenador:usuarios!eventos_entrenador_id_fkey(id, nombre, apellido)';

function toListItem(row: EventoListRow): EventoListItem {
  const entrenadorNombre = row.entrenador
    ? toNullable([row.entrenador.nombre ?? '', row.entrenador.apellido ?? ''].join(' '))
    : null;

  return {
    id: row.id,
    tenantId: row.tenant_id,
    nombre: row.nombre ?? 'Evento sin nombre',
    descripcion: row.descripcion,
    disciplinaId: row.disciplina_id,
    disciplinaNombre: row.disciplina?.nombre ?? 'Sin disciplina',
    escenarioId: row.escenario_id,
    escenarioNombre: row.escenario?.nombre ?? null,
    entrenadorId: row.entrenador_id,
    entrenadorNombre,
    fechaHora: row.fecha_hora,
    duracionMinutos: row.duracion_minutos,
    cupoMaximo: row.cupo_maximo,
    puntoEncuentro: row.punto_encuentro,
    estado: row.estado,
    precio: row.precio ?? [],
    bannerUrl: row.banner_url,
    activo: row.activo,
    publico: row.publico,
  };
}

function toPayload(input: Partial<EventoInput>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (input.nombre !== undefined) payload.nombre = toNullable(input.nombre);
  if (input.descripcion !== undefined) payload.descripcion = toNullable(input.descripcion);
  if (input.disciplinaId !== undefined) payload.disciplina_id = input.disciplinaId;
  if (input.escenarioId !== undefined) payload.escenario_id = toNullable(input.escenarioId);
  if (input.entrenadorId !== undefined) payload.entrenador_id = toNullable(input.entrenadorId);
  if (input.fechaHora !== undefined) payload.fecha_hora = toNullable(input.fechaHora);
  if (input.duracionMinutos !== undefined) payload.duracion_minutos = input.duracionMinutos;
  if (input.cupoMaximo !== undefined) payload.cupo_maximo = input.cupoMaximo;
  if (input.puntoEncuentro !== undefined) payload.punto_encuentro = toNullable(input.puntoEncuentro);
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.reservaAntelacionHoras !== undefined) payload.reserva_antelacion_horas = input.reservaAntelacionHoras;
  if (input.cancelacionAntelacionHoras !== undefined) payload.cancelacion_antelacion_horas = input.cancelacionAntelacionHoras;
  if (input.precio !== undefined) payload.precio = input.precio ?? [];
  if (input.bannerUrl !== undefined) payload.banner_url = toNullable(input.bannerUrl);
  if (input.activo !== undefined) payload.activo = input.activo;
  if (input.publico !== undefined) payload.publico = input.publico;
  if (input.omitirConfirmacionCompra !== undefined) payload.omitir_confirmacion_compra = input.omitirConfirmacionCompra;
  if (input.cronograma !== undefined) payload.cronograma = input.cronograma ?? [];
  if (input.incluye !== undefined) payload.incluye = input.incluye ?? [];
  if (input.descripcionLarga !== undefined) payload.descripcion_larga = toNullable(input.descripcionLarga);
  if (input.paginaEventoUrl !== undefined) payload.pagina_evento_url = toNullable(input.paginaEventoUrl);

  return payload;
}

export const eventosService = {
  async listEventos(tenantId: string, filters: EventosListFilters = {}): Promise<EventoListItem[]> {
    const supabase = createClient();

    let query = supabase.from('eventos').select(LIST_SELECT).eq('tenant_id', tenantId);

    if (filters.desde) query = query.gte('fecha_hora', filters.desde);
    if (filters.hasta) query = query.lt('fecha_hora', filters.hasta);

    const { data, error } = await query.order('fecha_hora', { ascending: true, nullsFirst: false });

    if (error) {
      throw mapServiceError(error);
    }

    return ((data ?? []) as unknown as EventoListRow[]).map(toListItem);
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

  async createEvento(tenantId: string, input: EventoInput): Promise<Evento> {
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw forbiddenError();
    }

    const payload = {
      ...toPayload(input),
      tenant_id: tenantId,
      creado_por: authData.user.id,
    };

    const { data, error } = await supabase.from('eventos').insert(payload).select('*').single();

    if (error) {
      throw mapServiceError(error);
    }

    return data as Evento;
  },

  async updateEvento(tenantId: string, eventoId: string, input: Partial<EventoInput>): Promise<Evento> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('eventos')
      .update(toPayload(input))
      .eq('tenant_id', tenantId)
      .eq('id', eventoId)
      .select('*')
      .single();

    if (error) {
      throw mapServiceError(error);
    }

    return data as Evento;
  },

  async updateEstadoEvento(tenantId: string, eventoId: string, estado: EventoEstado): Promise<Evento> {
    if (!EVENTO_ESTADOS.includes(estado)) {
      throw new EventoServiceError('invalid_data', 'Los datos del evento no son válidos.');
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
