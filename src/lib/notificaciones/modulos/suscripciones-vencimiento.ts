import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { getAppUrl } from '@/lib/portal/privileged-route';
import { renderFilas, renderLayout, renderParrafo } from '@/lib/notificaciones/plantillas/layout';
import type {
  NotificacionEmail,
  NotificacionHandler,
  NotificacionOutboxRow,
} from '@/types/portal/notificaciones.types';

// Subscription expiry alerts (US-0135). Rows are enqueued by the daily job
// `notificar_vencimientos_suscripciones` from the tenant's rules; the subscription is re-read here.

type Embed<T> = T | T[] | null;

type SuscripcionRow = {
  id: string;
  tenant_id: string;
  estado: string;
  fecha_fin: string | null;
  plan: Embed<{ nombre: string }>;
  plan_tipo: Embed<{ nombre: string }>;
  tenant: Embed<{ nombre: string }>;
  atleta: Embed<{ nombre: string | null; apellido: string | null; email: string | null }>;
};

type Aviso = {
  tenantId: string;
  plan: string;
  tenantNombre: string;
  atletaNombre: string;
  atletaEmail: string | null;
  dias: string;
  fechaFin: string;
};

function uno<T>(value: Embed<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** `YYYY-MM-DD` → `DD/MM/YYYY` (a plain date: no timezone involved). */
function fechaTexto(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/**
 * `null` = do not send: the subscription is gone, changed state (renewed into another state,
 * cancelled, already expired) or got a new end date since the alert was computed.
 */
async function cargarAviso(row: NotificacionOutboxRow, estadoEsperado: 'activa' | 'vencida'): Promise<Aviso | null> {
  if (!row.entidad_id) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('suscripciones')
    .select(
      'id, tenant_id, estado, fecha_fin, plan:planes(nombre), plan_tipo:plan_tipos(nombre), ' +
        'tenant:tenants(nombre), atleta:usuarios!suscripciones_atleta_id_fkey(nombre, apellido, email)',
    )
    .eq('id', row.entidad_id)
    .maybeSingle();
  if (error) throw new Error(`suscripcion_load_failed:${error.code ?? 'unknown'}`);
  if (!data) return null;

  const suscripcion = data as unknown as SuscripcionRow;
  const fechaAviso = typeof row.payload.fecha_fin === 'string' ? row.payload.fecha_fin.slice(0, 10) : null;
  if (suscripcion.estado !== estadoEsperado) return null;
  if (!suscripcion.fecha_fin || suscripcion.fecha_fin.slice(0, 10) !== fechaAviso) return null;

  const planNombre = uno(suscripcion.plan)?.nombre ?? 'Plan';
  const tipoNombre = uno(suscripcion.plan_tipo)?.nombre;
  const atleta = uno(suscripcion.atleta);
  const dias = Number(row.payload.dias) || 0;

  return {
    tenantId: suscripcion.tenant_id,
    plan: tipoNombre ? `${planNombre} — ${tipoNombre}` : planNombre,
    tenantNombre: uno(suscripcion.tenant)?.nombre ?? '',
    atletaNombre: [atleta?.nombre, atleta?.apellido].filter(Boolean).join(' ') || 'Un atleta',
    atletaEmail: atleta?.email ?? null,
    dias: dias === 1 ? '1 día' : `${dias} días`,
    fechaFin: fechaTexto(suscripcion.fecha_fin),
  };
}

type Contenido = {
  asunto: string;
  titulo: string;
  parrafos: string[];
  filas: [string, string | null][];
  cta: { texto: string; url: string };
};

function componer({ asunto, titulo, parrafos, filas, cta }: Contenido): NotificacionEmail {
  const visibles = filas.filter(([, valor]) => Boolean(valor));
  return {
    asunto,
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

function handlerAtleta(pre: boolean): NotificacionHandler {
  return async (row) => {
    const aviso = await cargarAviso(row, pre ? 'activa' : 'vencida');
    if (!aviso) return null;
    const titulo = pre ? 'Tu suscripción está por vencer' : 'Tu suscripción venció';
    return componer({
      asunto: `${titulo} — ${aviso.plan}`,
      titulo,
      parrafos: [
        pre
          ? `Tu suscripción a ${aviso.plan} en ${aviso.tenantNombre} vence en ${aviso.dias}, el ${aviso.fechaFin}.`
          : `Tu suscripción a ${aviso.plan} en ${aviso.tenantNombre} venció hace ${aviso.dias}, el ${aviso.fechaFin}.`,
        pre ? 'Renueva tu plan para no perder el acceso.' : 'Renueva tu plan para volver a reservar.',
      ],
      filas: [
        ['Organización', aviso.tenantNombre || null],
        ['Plan', aviso.plan],
        ['Fecha de vencimiento', aviso.fechaFin],
      ],
      cta: { texto: 'Ver mis suscripciones', url: `${getAppUrl()}/portal/mis-suscripciones` },
    });
  };
}

function handlerAdmin(pre: boolean): NotificacionHandler {
  return async (row) => {
    const aviso = await cargarAviso(row, pre ? 'activa' : 'vencida');
    if (!aviso) return null;
    const titulo = pre ? 'Suscripción por vencer' : 'Suscripción vencida';
    return componer({
      asunto: `${titulo} — ${aviso.atletaNombre}`,
      titulo,
      parrafos: [
        pre
          ? `La suscripción de ${aviso.atletaNombre} a ${aviso.plan} vence en ${aviso.dias}, el ${aviso.fechaFin}.`
          : `La suscripción de ${aviso.atletaNombre} a ${aviso.plan} venció hace ${aviso.dias}, el ${aviso.fechaFin}.`,
      ],
      filas: [
        ['Atleta', aviso.atletaNombre],
        ['Correo del atleta', aviso.atletaEmail],
        ['Plan', aviso.plan],
        ['Fecha de vencimiento', aviso.fechaFin],
      ],
      cta: {
        texto: 'Ver suscripciones',
        url: `${getAppUrl()}/portal/orgs/${aviso.tenantId}/gestion-suscripciones`,
      },
    });
  };
}

export const suscripcionesVencimientoHandlers: Record<string, NotificacionHandler> = {
  'suscripciones.vencimiento_pre': handlerAtleta(true),
  'suscripciones.vencimiento_pos': handlerAtleta(false),
  'suscripciones.vencimiento_pre_admin': handlerAdmin(true),
  'suscripciones.vencimiento_pos_admin': handlerAdmin(false),
};
