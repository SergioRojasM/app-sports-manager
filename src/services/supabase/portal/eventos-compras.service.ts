import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';
import type { EventoEntradaTipo, EventoEscenarioSnapshot, EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';
import type { FormularioPerfilCampo, FormularioSeccion } from '@/types/portal/formularios.types';
import {
  EventoCompraServiceError,
  type CompraAdminItem,
  type CompraResultado,
  type CuponValidacion,
  type EntradaVendible,
  type EventoCompraEstado,
  type EventoCompraServiceErrorCode,
  type EventoFormularioRespuesta,
  type EventoFormularioSnapshot,
  type EventoTicketEstado,
  type IniciarCompraInput,
  type MiCompra,
} from '@/types/portal/eventos-compras.types';

type PostgrestErrorLike = {
  code?: string;
  message?: string;
} | null;

/** Proof and form-image links are short-lived (US-0121). */
const ARCHIVO_SIGNED_URL_TTL = 300;

const UNKNOWN_MESSAGE = 'No se pudo completar la operación. Intenta de nuevo.';

/** RPC exception codes (`CODE` or `CODE:<event name>`) → client code and Spanish message. */
const COMPRA_ERRORS: Record<string, { code: EventoCompraServiceErrorCode; message: (detalle: string) => string }> = {
  EVENTO_NO_DISPONIBLE: { code: 'no_disponible', message: () => 'Este evento ya no está disponible para la venta.' },
  VENTA_CERRADA: { code: 'venta_cerrada', message: () => 'La venta de esta entrada está cerrada.' },
  ENTRADA_INVALIDA: { code: 'invalid_data', message: () => 'La entrada seleccionada no está disponible.' },
  CUPON_INVALIDO: { code: 'cupon_invalido', message: () => 'El cupón no es válido para esta entrada.' },
  METODO_PAGO_INVALIDO: { code: 'invalid_data', message: () => 'Selecciona un método de pago válido.' },
  DATOS_INVALIDOS: { code: 'invalid_data', message: () => 'Revisa tus datos: nombre, correo y fecha de nacimiento.' },
  FORMULARIO_INCOMPLETO: { code: 'invalid_data', message: () => 'Completa todos los campos obligatorios del formulario.' },
  ENTRADA_DUPLICADA: {
    code: 'duplicada',
    message: (evento) =>
      `Ya existe una entrada para este correo en ${evento || 'este evento'}. Inicia sesión o crea tu cuenta con ese correo para verla.`,
  },
  CUPO_AGOTADO: { code: 'agotado', message: (evento) => `No quedan cupos para ${evento || 'este evento'}.` },
  BUNDLE_NO_DISPONIBLE: {
    code: 'no_disponible',
    message: () => 'Uno de los eventos incluidos en esta entrada ya no está disponible.',
  },
  COMPRA_EXPIRADA: { code: 'expirada', message: () => 'Tu reserva de cupo expiró. Vuelve a intentarlo.' },
  COMPROBANTE_REQUERIDO: { code: 'invalid_data', message: () => 'Adjunta un comprobante de pago válido.' },
  ARCHIVO_INVALIDO: { code: 'invalid_data', message: () => 'Adjunta un comprobante de pago válido.' },
  MOTIVO_REQUERIDO: { code: 'invalid_data', message: () => 'Indica el motivo del rechazo (máximo 500 caracteres).' },
  CANCELACION_NO_PERMITIDA: { code: 'no_cancelable', message: () => 'Esta entrada no se puede cancelar.' },
  ESTADO_INVALIDO: { code: 'invalid_state', message: () => 'La compra cambió de estado. Recarga la página.' },
  FORBIDDEN: { code: 'forbidden', message: () => 'No tienes permisos para esta acción.' },
};

export function mapCompraError(error: PostgrestErrorLike): EventoCompraServiceError {
  const raw = (error?.message ?? '').trim();
  const separator = raw.indexOf(':');
  const codigo = separator >= 0 ? raw.slice(0, separator) : raw;
  const detalle = separator >= 0 ? raw.slice(separator + 1).trim() : '';

  const known = COMPRA_ERRORS[codigo];
  if (known) return new EventoCompraServiceError(known.code, known.message(detalle));

  if (error?.code === '42501') return new EventoCompraServiceError('forbidden', COMPRA_ERRORS.FORBIDDEN.message(''));

  return new EventoCompraServiceError('unknown', UNKNOWN_MESSAGE);
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function lugarDe(escenario: EventoEscenarioSnapshot | null | undefined, puntoEncuentro: string | null | undefined) {
  return escenario?.nombre ?? puntoEncuentro ?? null;
}

// ─── Row shapes ───

type RpcTicket = {
  id: string;
  evento_id: string;
  evento_nombre: string;
  fecha_hora: string | null;
  lugar: string | null;
  nombre_tenant: string;
  codigo: string;
  estado: EventoTicketEstado;
};

type RpcCompraResultado = {
  compra_id: string;
  tenant_id: string;
  estado: EventoCompraEstado;
  requiere_archivos: boolean;
  tickets: RpcTicket[] | null;
  cancelacion_antelacion_horas: number | null;
  total: number | string;
  entrada_nombre: string;
  comprador_nombre: string;
  comprador_email: string;
  created_at: string;
};

function toCompraResultado(row: RpcCompraResultado): CompraResultado {
  return {
    compraId: row.compra_id,
    tenantId: row.tenant_id,
    estado: row.estado,
    requiereArchivos: Boolean(row.requiere_archivos),
    tickets: (row.tickets ?? []).map((ticket) => ({
      id: ticket.id,
      eventoId: ticket.evento_id,
      eventoNombre: ticket.evento_nombre,
      fechaHora: ticket.fecha_hora,
      lugar: ticket.lugar,
      nombreTenant: ticket.nombre_tenant,
      codigo: ticket.codigo,
      estado: ticket.estado,
    })),
    cancelacionAntelacionHoras: row.cancelacion_antelacion_horas,
    total: toNumber(row.total),
    entradaNombre: row.entrada_nombre,
    compradorNombre: row.comprador_nombre,
    compradorEmail: row.comprador_email,
    createdAt: row.created_at,
  };
}

type SnapshotCampoRow = Partial<FormularioSeccion> & { id: string };

type FormularioSnapshotRow = {
  nombre: string;
  perfil_campos_requeridos: FormularioPerfilCampo[] | null;
  campos: SnapshotCampoRow[] | null;
};

/** Snapshot rows are esquema rows minus timestamps; fill the fields the shared renderers expect. */
function toSnapshotCampos(campos: SnapshotCampoRow[] | null): FormularioSeccion[] {
  return (campos ?? []).map((campo) => ({
    id: campo.id,
    formulario_plantilla_id: campo.formulario_plantilla_id ?? '',
    seccion_tipo: campo.seccion_tipo ?? 'datos',
    seccion_descripcion: campo.seccion_descripcion ?? null,
    seccion_subtitulo: campo.seccion_subtitulo ?? null,
    campo_etiqueta: campo.campo_etiqueta ?? null,
    campo_nombre: campo.campo_nombre ?? null,
    campo_tipo: campo.campo_tipo ?? null,
    campo_lista_valores: campo.campo_lista_valores ?? null,
    campo_obligatorio: Boolean(campo.campo_obligatorio),
    campo_placeholder: campo.campo_placeholder ?? null,
    columna_ancho: campo.columna_ancho ?? 'completo',
    orden: campo.orden ?? 0,
    activo: true,
    created_at: '',
    updated_at: '',
  }));
}

function toSnapshot(row: FormularioSnapshotRow): Omit<EventoFormularioSnapshot, 'id'> {
  return {
    nombre: row.nombre,
    perfilCamposRequeridos: Array.isArray(row.perfil_campos_requeridos) ? row.perfil_campos_requeridos : [],
    campos: toSnapshotCampos(row.campos),
  };
}

type EventoEmbedRow = {
  id: string;
  nombre: string;
  nombre_tenant: string;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  escenario_id: EventoEscenarioSnapshot | null;
  punto_encuentro: string | null;
  banner_url: string | null;
  cancelacion_antelacion_horas: number | null;
};

type MiCompraRow = {
  id: string;
  tenant_id: string;
  evento_id: string;
  estado: EventoCompraEstado;
  entrada_nombre: string;
  entrada_tipo: EventoEntradaTipo;
  total: number | string;
  cupon_codigo: string | null;
  descuento_pct: number | string | null;
  metodo_pago: EventoMetodoPagoSnapshot | null;
  motivo_rechazo: string | null;
  comprador_nombre: string;
  comprador_email: string;
  created_at: string;
  evento: EventoEmbedRow | null;
  tickets:
    | {
        id: string;
        evento_id: string;
        codigo: string;
        estado: EventoTicketEstado;
        asistente_nombre: string;
        asistente_email: string;
        created_at: string;
        evento: Pick<EventoEmbedRow, 'nombre' | 'nombre_tenant' | 'fecha_hora' | 'escenario_id' | 'punto_encuentro'> | null;
      }[]
    | null;
};

function toMiCompra(row: MiCompraRow): MiCompra {
  const tickets = [...(row.tickets ?? [])].sort(
    (left, right) =>
      Number(left.evento_id !== row.evento_id) - Number(right.evento_id !== row.evento_id) ||
      left.created_at.localeCompare(right.created_at) ||
      left.codigo.localeCompare(right.codigo),
  );

  return {
    id: row.id,
    tenantId: row.tenant_id,
    eventoId: row.evento_id,
    estado: row.estado,
    entradaNombre: row.entrada_nombre,
    entradaTipo: row.entrada_tipo,
    total: toNumber(row.total),
    cuponCodigo: row.cupon_codigo,
    descuentoPct: toNumberOrNull(row.descuento_pct),
    metodoPago: row.metodo_pago,
    motivoRechazo: row.motivo_rechazo,
    compradorNombre: row.comprador_nombre,
    compradorEmail: row.comprador_email,
    createdAt: row.created_at,
    evento: row.evento
      ? {
          id: row.evento.id,
          nombre: row.evento.nombre,
          nombreTenant: row.evento.nombre_tenant,
          fechaHora: row.evento.fecha_hora,
          duracionMinutos: row.evento.duracion_minutos,
          lugar: lugarDe(row.evento.escenario_id, row.evento.punto_encuentro),
          bannerUrl: row.evento.banner_url,
          cancelacionAntelacionHoras: row.evento.cancelacion_antelacion_horas,
        }
      : null,
    tickets: tickets.map((ticket) => ({
      id: ticket.id,
      eventoId: ticket.evento_id,
      codigo: ticket.codigo,
      estado: ticket.estado,
      asistenteNombre: ticket.asistente_nombre,
      asistenteEmail: ticket.asistente_email,
      eventoNombre: ticket.evento?.nombre ?? null,
      fechaHora: ticket.evento?.fecha_hora ?? null,
      lugar: ticket.evento ? lugarDe(ticket.evento.escenario_id, ticket.evento.punto_encuentro) : null,
      nombreTenant: ticket.evento?.nombre_tenant ?? null,
    })),
  };
}

type RespuestaRow = {
  id: string;
  datos_perfil: Record<string, string> | null;
  respuestas: Record<string, string> | null;
  archivos: Record<string, string> | null;
  formulario: FormularioSnapshotRow | null;
};

type CompraAdminRow = {
  id: string;
  estado: EventoCompraEstado;
  comprador_usuario_id: string | null;
  comprador_nombre: string;
  comprador_email: string;
  comprador_fecha_nacimiento: string;
  entrada_nombre: string;
  entrada_tipo: EventoEntradaTipo;
  valor_base: number | string;
  total: number | string;
  cupon_codigo: string | null;
  descuento_pct: number | string | null;
  metodo_pago: EventoMetodoPagoSnapshot | null;
  comprobante_path: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  validado_at: string | null;
  tickets: { evento_id: string; codigo: string; estado: EventoTicketEstado }[] | null;
  // A one-to-one embed (compra_id is unique) comes back as an object, or null
  respuesta: RespuestaRow | RespuestaRow[] | null;
};

function toRespuesta(row: RespuestaRow | RespuestaRow[] | null): EventoFormularioRespuesta | null {
  const respuesta = Array.isArray(row) ? (row[0] ?? null) : row;
  if (!respuesta) return null;
  return {
    id: respuesta.id,
    datosPerfil: respuesta.datos_perfil ?? {},
    respuestas: respuesta.respuestas ?? {},
    archivos: respuesta.archivos ?? {},
    formulario: respuesta.formulario ? toSnapshot(respuesta.formulario) : null,
  };
}

function toCompraAdminItem(row: CompraAdminRow): CompraAdminItem {
  return {
    id: row.id,
    estado: row.estado,
    compradorNombre: row.comprador_nombre,
    compradorEmail: row.comprador_email,
    compradorFechaNacimiento: row.comprador_fecha_nacimiento,
    registrado: row.comprador_usuario_id !== null,
    entradaNombre: row.entrada_nombre,
    entradaTipo: row.entrada_tipo,
    valorBase: toNumber(row.valor_base),
    total: toNumber(row.total),
    cuponCodigo: row.cupon_codigo,
    descuentoPct: toNumberOrNull(row.descuento_pct),
    metodoPago: row.metodo_pago,
    comprobantePath: row.comprobante_path,
    motivoRechazo: row.motivo_rechazo,
    createdAt: row.created_at,
    validadoAt: row.validado_at,
    tickets: (row.tickets ?? []).map((ticket) => ({
      eventoId: ticket.evento_id,
      codigo: ticket.codigo,
      estado: ticket.estado,
    })),
    respuesta: toRespuesta(row.respuesta),
  };
}

const EVENTO_EMBED_SELECT =
  'id, nombre, nombre_tenant, fecha_hora, duracion_minutos, escenario_id, punto_encuentro, banner_url, cancelacion_antelacion_horas';

const MIS_COMPRAS_SELECT =
  'id, tenant_id, evento_id, estado, entrada_nombre, entrada_tipo, total, cupon_codigo, descuento_pct, metodo_pago, ' +
  'motivo_rechazo, comprador_nombre, comprador_email, created_at, ' +
  `evento:eventos(${EVENTO_EMBED_SELECT}), ` +
  'tickets:evento_tickets(id, evento_id, codigo, estado, asistente_nombre, asistente_email, created_at, ' +
  'evento:eventos(nombre, nombre_tenant, fecha_hora, escenario_id, punto_encuentro))';

const COMPRAS_ADMIN_SELECT =
  '*, tickets:evento_tickets(evento_id, codigo, estado), ' +
  'respuesta:evento_formulario_respuestas(id, datos_perfil, respuestas, archivos, ' +
  'formulario:evento_formularios(nombre, perfil_campos_requeridos, campos))';

function extensionDe(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : null;
  if (fromName && /^[a-z0-9]{2,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split('/').pop();
  return fromType === 'jpeg' ? 'jpg' : (fromType ?? 'bin');
}

export const eventoComprasService = {
  /** Ticket types with a name and value (sale-window filtering happens in the hook; the server re-validates). */
  async listEntradasVendibles(eventoId: string): Promise<EntradaVendible[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('evento_entradas')
      .select('id, tipo_entrada, nombre, valor, valida_desde, valida_hasta, eventos_id_bundle, orden, metodos_pago')
      .eq('evento_id', eventoId)
      .not('nombre', 'is', null)
      .not('valor', 'is', null)
      .order('orden', { ascending: true });

    if (error) throw mapCompraError(error);

    return (data ?? []).map((row) => ({
      id: row.id as string,
      tipoEntrada: row.tipo_entrada as EventoEntradaTipo,
      nombre: row.nombre as string,
      valor: toNumber(row.valor),
      validaDesde: row.valida_desde as string | null,
      validaHasta: row.valida_hasta as string | null,
      eventosIdBundle: Array.isArray(row.eventos_id_bundle) ? (row.eventos_id_bundle as string[]) : [],
      orden: row.orden as number,
      metodosPago: Array.isArray(row.metodos_pago) ? (row.metodos_pago as EventoMetodoPagoSnapshot[]) : [],
    }));
  },

  /** Names of the bundled events the caller can read (RLS limits it). */
  async listNombresEventosBundle(ids: string[]): Promise<{ id: string; nombre: string }[]> {
    if (ids.length === 0) return [];
    const supabase = createClient();
    const { data, error } = await supabase.from('eventos').select('id, nombre').in('id', ids);
    if (error) throw mapCompraError(error);
    return (data ?? []) as { id: string; nombre: string }[];
  },

  /** The event's current form snapshot, readable by guests too. Null when the event asks for no form. */
  async getFormularioEvento(eventoId: string): Promise<EventoFormularioSnapshot | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('evento_formularios')
      .select('id, nombre, perfil_campos_requeridos, campos')
      .eq('evento_id', eventoId)
      .eq('vigente', true)
      .maybeSingle();

    if (error) throw mapCompraError(error);
    if (!data) return null;

    return { id: data.id as string, ...toSnapshot(data as FormularioSnapshotRow) };
  },

  async validarCupon(eventoId: string, entradaId: string, codigo: string): Promise<CuponValidacion> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('validar_cupon_evento', {
      p_evento_id: eventoId,
      p_entrada_id: entradaId,
      p_codigo: codigo,
    });

    if (error) throw mapCompraError(error);

    const row = data as { valido: boolean; descuento_pct?: number | string | null; total?: number | string | null; motivo?: string | null };
    return {
      valido: Boolean(row?.valido),
      descuentoPct: toNumberOrNull(row?.descuento_pct),
      total: toNumberOrNull(row?.total),
      motivo: row?.motivo ?? null,
    };
  },

  async iniciarCompra(input: IniciarCompraInput): Promise<CompraResultado> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('iniciar_compra_evento', {
      p_evento_id: input.eventoId,
      p_entrada_id: input.entradaId,
      p_cupon: input.cupon,
      p_metodo_pago_id: input.metodoPagoId,
      p_comprador: {
        nombre: input.comprador.nombre,
        email: input.comprador.email,
        fecha_nacimiento: input.comprador.fechaNacimiento,
      },
      p_datos_perfil: input.datosPerfil,
      p_formulario_respuesta: input.respuestas,
    });

    if (error) throw mapCompraError(error);
    return toCompraResultado(data as RpcCompraResultado);
  },

  /** Uploads a purchase file (write-once) and returns its storage path. */
  async subirArchivoCompra(tenantId: string, compraId: string, kind: string, file: File): Promise<string> {
    const supabase = createClient();
    const safeKind = kind.replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `compras-eventos/${tenantId}/${compraId}/${safeKind}-${Date.now()}.${extensionDe(file)}`;

    const { error } = await supabase.storage.from('org-assets').upload(path, file, {
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) {
      throw new EventoCompraServiceError('unknown', 'No se pudo subir el archivo. Intenta de nuevo.');
    }

    return path;
  },

  async finalizarCompra(
    compraId: string,
    comprobantePath: string | null,
    archivos: Record<string, string>,
  ): Promise<CompraResultado> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('finalizar_compra_evento', {
      p_compra_id: compraId,
      p_comprobante_path: comprobantePath,
      p_archivos: archivos,
    });

    if (error) throw mapCompraError(error);
    return toCompraResultado(data as RpcCompraResultado);
  },

  /** Links guest purchases made with the account's verified email. Returns how many were linked. */
  async vincularComprasInvitado(): Promise<number> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('vincular_compras_invitado');
    if (error) throw mapCompraError(error);
    return toNumber(data);
  },

  /** The caller's purchases (RLS: own rows), newest first. */
  async listMisCompras(): Promise<MiCompra[]> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return [];

    const { data, error } = await supabase
      .from('evento_compras')
      .select(MIS_COMPRAS_SELECT)
      .eq('comprador_usuario_id', auth.user.id)
      .order('created_at', { ascending: false });

    if (error) throw mapCompraError(error);
    return ((data ?? []) as unknown as MiCompraRow[]).map(toMiCompra);
  },

  /** A live ticket of the caller for this event, or null. */
  async getMiTicketEnEvento(eventoId: string): Promise<{ id: string; estado: EventoTicketEstado } | null> {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data, error } = await supabase
      .from('evento_tickets')
      .select('id, estado')
      .eq('evento_id', eventoId)
      .eq('usuario_id', auth.user.id)
      .neq('estado', 'anulada')
      .limit(1);

    if (error) throw mapCompraError(error);
    const row = data?.[0];
    return row ? { id: row.id as string, estado: row.estado as EventoTicketEstado } : null;
  },

  async reenviarComprobante(compraId: string, comprobantePath: string): Promise<CompraResultado> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('reenviar_comprobante_compra_evento', {
      p_compra_id: compraId,
      p_comprobante_path: comprobantePath,
    });
    if (error) throw mapCompraError(error);
    return toCompraResultado(data as RpcCompraResultado);
  },

  async cancelarCompra(compraId: string): Promise<CompraResultado> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('cancelar_compra_evento', { p_compra_id: compraId });
    if (error) throw mapCompraError(error);
    return toCompraResultado(data as RpcCompraResultado);
  },

  /** Every purchase of an event (RLS: tenant staff), newest first. */
  async listComprasEvento(tenantId: string, eventoId: string): Promise<CompraAdminItem[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('evento_compras')
      .select(COMPRAS_ADMIN_SELECT)
      .eq('tenant_id', tenantId)
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });

    if (error) throw mapCompraError(error);
    return ((data ?? []) as unknown as CompraAdminRow[]).map(toCompraAdminItem);
  },

  /** Tickets of the event that still count against capacity. */
  async contarVendidas(eventoId: string): Promise<number> {
    const supabase = createClient();
    const { count, error } = await supabase
      .from('evento_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('evento_id', eventoId)
      .neq('estado', 'anulada');

    if (error) throw mapCompraError(error);
    return count ?? 0;
  },

  async validarCompra(compraId: string, aprobar: boolean, motivo?: string): Promise<CompraResultado> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('validar_compra_evento', {
      p_compra_id: compraId,
      p_aprobar: aprobar,
      p_motivo: motivo ?? null,
    });
    if (error) throw mapCompraError(error);
    return toCompraResultado(data as RpcCompraResultado);
  },

  /** Short-lived signed URL for a proof or a form image. */
  async getArchivoUrl(path: string): Promise<string> {
    const supabase = createClient();
    try {
      return await storageService.getSignedUrl(supabase, path, ARCHIVO_SIGNED_URL_TTL);
    } catch {
      throw new EventoCompraServiceError('forbidden', 'No se pudo abrir el archivo.');
    }
  },
};
