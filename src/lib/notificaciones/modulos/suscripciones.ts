import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { formatCop } from '@/lib/portal/eventos.utils';
import { getAppUrl } from '@/lib/portal/privileged-route';
import { renderFilas, renderLayout, renderParrafo } from '@/lib/notificaciones/plantillas/layout';
import type {
  NotificacionEmail,
  NotificacionHandler,
  NotificacionOutboxRow,
} from '@/types/portal/notificaciones.types';

// Subscription and payment emails (US-0134). Rows are enqueued by `comprar_suscripcion` and by the
// triggers on `suscripciones` / `pagos`; the data is read here, at send time.

type Embed<T> = T | T[] | null;

type SuscripcionRow = {
  id: string;
  tenant_id: string;
  estado: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  plan: Embed<{ nombre: string }>;
  plan_tipo: Embed<{ nombre: string }>;
  tenant: Embed<{ nombre: string }>;
  atleta: Embed<{ nombre: string | null; apellido: string | null }>;
};

type PagoRow = {
  monto: number | string | null;
  estado: string;
  motivo_rechazo: string | null;
  comprobante_path: string | null;
};

type SuscripcionEmail = {
  tenantId: string;
  plan: string;
  tenantNombre: string;
  atletaNombre: string;
  estado: string;
  vigencia: string | null;
  pago: { monto: number; estado: string; motivoRechazo: string | null; tieneComprobante: boolean } | null;
};

const ESTADO_SUSCRIPCION: Record<string, string> = {
  pendiente: 'En revisión',
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
};

const ESTADO_PAGO: Record<string, string> = {
  pendiente: 'Pendiente de validación',
  validado: 'Aprobado',
  rechazado: 'Rechazado',
};

function uno<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` (a plain date: no timezone involved). */
function fechaTexto(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

async function cargarSuscripcion(row: NotificacionOutboxRow): Promise<SuscripcionEmail | null> {
  if (!row.entidad_id) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('suscripciones')
    .select(
      'id, tenant_id, estado, fecha_inicio, fecha_fin, plan:planes(nombre), plan_tipo:plan_tipos(nombre), ' +
        'tenant:tenants(nombre), atleta:usuarios!suscripciones_atleta_id_fkey(nombre, apellido)',
    )
    .eq('id', row.entidad_id)
    .maybeSingle();
  if (error) throw new Error(`suscripcion_load_failed:${error.code ?? 'unknown'}`);
  if (!data) return null;

  const suscripcion = data as unknown as SuscripcionRow;

  // The payment the notification is about, or the latest one of the subscription
  const pagoId = typeof row.payload.pago_id === 'string' ? row.payload.pago_id : null;
  const pagoQuery = supabase.from('pagos').select('monto, estado, motivo_rechazo, comprobante_path');
  const { data: pagoData, error: pagoError } = pagoId
    ? await pagoQuery.eq('id', pagoId).maybeSingle()
    : await pagoQuery
        .eq('suscripcion_id', suscripcion.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
  if (pagoError) throw new Error(`pago_load_failed:${pagoError.code ?? 'unknown'}`);
  const pago = pagoData as PagoRow | null;

  const planNombre = uno(suscripcion.plan)?.nombre ?? 'Plan';
  const tipoNombre = uno(suscripcion.plan_tipo)?.nombre;
  const atleta = uno(suscripcion.atleta);

  return {
    tenantId: suscripcion.tenant_id,
    plan: tipoNombre ? `${planNombre} — ${tipoNombre}` : planNombre,
    tenantNombre: uno(suscripcion.tenant)?.nombre ?? '',
    atletaNombre: [atleta?.nombre, atleta?.apellido].filter(Boolean).join(' ') || 'Un atleta',
    estado: suscripcion.estado,
    vigencia:
      suscripcion.fecha_inicio && suscripcion.fecha_fin
        ? `${fechaTexto(suscripcion.fecha_inicio)} – ${fechaTexto(suscripcion.fecha_fin)}`
        : null,
    pago: pago
      ? {
          monto: Number(pago.monto) || 0,
          estado: pago.estado,
          motivoRechazo: pago.motivo_rechazo?.trim() || null,
          tieneComprobante: Boolean(pago.comprobante_path),
        }
      : null,
  };
}

type Contenido = {
  titulo: string;
  plan: string;
  parrafos: string[];
  filas: [string, string | null][];
  cta: { texto: string; url: string };
};

function componer({ titulo, plan, parrafos, filas, cta }: Contenido): NotificacionEmail {
  const visibles = filas.filter(([, valor]) => Boolean(valor));
  return {
    asunto: `${titulo} — ${plan}`,
    html: renderLayout({ titulo, cuerpoHtml: parrafos.map(renderParrafo).join('') + renderFilas(filas), cta }),
    texto: [
      titulo,
      '',
      ...parrafos,
      '',
      ...visibles.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      '',
      `${cta.texto}: ${cta.url}`,
    ].join('\n'),
    adjuntos: [],
  };
}

/**
 * Rows shared by every email; `extra` rows go first (reason, athlete, proof). `evento` pins the state
 * the email is about: data is read at send time, and a late delivery must not show a newer state
 * that contradicts its own title ("Pago rechazado" next to "Estado del pago: Aprobado").
 */
function filasBase(
  s: SuscripcionEmail,
  extra: [string, string | null][] = [],
  evento: { suscripcion?: string; pago?: string } = {},
): [string, string | null][] {
  const estadoSuscripcion = evento.suscripcion ?? s.estado;
  const estadoPago = evento.pago ?? s.pago?.estado ?? null;
  return [
    ...extra,
    ['Organización', s.tenantNombre || null],
    ['Plan', s.plan],
    ['Valor', s.pago ? (s.pago.monto === 0 ? 'Gratis' : formatCop(s.pago.monto)) : null],
    ['Estado de la suscripción', ESTADO_SUSCRIPCION[estadoSuscripcion] ?? estadoSuscripcion],
    ['Estado del pago', estadoPago ? (ESTADO_PAGO[estadoPago] ?? estadoPago) : null],
    ['Vigencia', s.vigencia],
  ];
}

function ctaAtleta() {
  return { texto: 'Ver mis suscripciones', url: `${getAppUrl()}/portal/mis-suscripciones` };
}

function ctaAdmin(tenantId: string, requiereValidacion: boolean) {
  return {
    texto: requiereValidacion ? 'Validar' : 'Ver suscripciones',
    url: `${getAppUrl()}/portal/orgs/${tenantId}/gestion-suscripciones`,
  };
}

type Redactor = (s: SuscripcionEmail, row: NotificacionOutboxRow) => Omit<Contenido, 'plan'>;

function handler(redactar: Redactor): NotificacionHandler {
  return async (row) => {
    const suscripcion = await cargarSuscripcion(row);
    if (!suscripcion) return null;
    return componer({ ...redactar(suscripcion, row), plan: suscripcion.plan });
  };
}

const suscripcionRecibida = handler((s) => ({
  titulo: 'Recibimos tu solicitud',
  parrafos: [
    `Tu suscripción a ${s.plan} en ${s.tenantNombre} está en revisión.`,
    'Te avisaremos cuando el administrador valide tu pago y active la suscripción.',
  ],
  filas: filasBase(s),
  cta: ctaAtleta(),
}));

const pagoValidado = handler((s) => ({
  titulo: 'Pago aprobado',
  parrafos: [`Tu pago de ${s.plan} fue aprobado.`],
  filas: filasBase(s, [], { pago: 'validado' }),
  cta: ctaAtleta(),
}));

const pagoRechazado = handler((s, row) => {
  // The reason of the moment of the rejection: a later re-upload clears it on the payment
  const motivo =
    (typeof row.payload.motivo_rechazo === 'string' && row.payload.motivo_rechazo.trim()) ||
    s.pago?.motivoRechazo ||
    null;
  return {
    titulo: 'Pago rechazado',
    parrafos: [
      `Tu pago de ${s.plan} fue rechazado.`,
      'Puedes subir un nuevo comprobante desde "Mis suscripciones".',
    ],
    filas: filasBase(s, [['Motivo', motivo]], { pago: 'rechazado' }),
    cta: ctaAtleta(),
  };
});

const suscripcionAprobada = handler((s) => ({
  titulo: 'Suscripción activa',
  parrafos: [`Tu suscripción a ${s.plan} en ${s.tenantNombre} ya está activa.`],
  filas: filasBase(s, [], { suscripcion: 'activa' }),
  cta: ctaAtleta(),
}));

const suscripcionRechazada = handler((s) => ({
  titulo: 'Suscripción rechazada',
  parrafos: [
    `Tu solicitud de ${s.plan} en ${s.tenantNombre} fue rechazada.`,
    'Si crees que es un error, comunícate con la organización.',
  ],
  filas: filasBase(s, [], { suscripcion: 'cancelada' }),
  cta: ctaAtleta(),
}));

const suscripcionAsignada = handler((s) => ({
  titulo: 'Nueva suscripción',
  parrafos: [`${s.tenantNombre} agregó la suscripción ${s.plan} a tu cuenta.`],
  filas: filasBase(s),
  cta: ctaAtleta(),
}));

const suscripcionNuevaAdmin = handler((s) => {
  // Computed from the current state, so the email is right even if it is sent after a validation
  const requiere = s.estado === 'pendiente' || s.pago?.estado === 'pendiente';
  return {
    titulo: requiere ? 'Nueva suscripción por validar' : 'Nueva suscripción',
    parrafos: [
      `${s.atletaNombre} compró ${s.plan}.`,
      requiere ? 'La solicitud está esperando tu validación.' : 'No requiere validación.',
    ],
    filas: filasBase(s, [
      ['Atleta', s.atletaNombre],
      ['Comprobante adjunto', s.pago ? (s.pago.tieneComprobante ? 'Sí' : 'No') : null],
    ]),
    cta: ctaAdmin(s.tenantId, requiere),
  };
});

const pagoComprobanteAdmin = handler((s) => ({
  titulo: 'Nuevo pago por validar',
  parrafos: [`${s.atletaNombre} subió un comprobante para ${s.plan}.`],
  filas: filasBase(s, [['Atleta', s.atletaNombre]]),
  cta: ctaAdmin(s.tenantId, true),
}));

export const suscripcionesHandlers: Record<string, NotificacionHandler> = {
  'suscripciones.suscripcion_recibida': suscripcionRecibida,
  'suscripciones.pago_validado': pagoValidado,
  'suscripciones.pago_rechazado': pagoRechazado,
  'suscripciones.suscripcion_aprobada': suscripcionAprobada,
  'suscripciones.suscripcion_rechazada': suscripcionRechazada,
  'suscripciones.suscripcion_asignada': suscripcionAsignada,
  'suscripciones.suscripcion_nueva_admin': suscripcionNuevaAdmin,
  'suscripciones.pago_comprobante_admin': pagoComprobanteAdmin,
};
