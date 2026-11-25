import 'server-only';
import { createServiceClient } from '@/services/supabase/server';
import { construirEntradasPdf } from '@/lib/portal/eventos-ticket-pdf';
import { formatCop, formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { getAppUrl } from '@/lib/portal/privileged-route';
import { renderFilas, renderLayout, renderParrafo } from '@/lib/notificaciones/plantillas/layout';
import type { EventoCompraEstado, EventoTicketEstado, TicketPdfData } from '@/types/portal/eventos-compras.types';
import type {
  NotificacionAdjunto,
  NotificacionEmail,
  NotificacionHandler,
  NotificacionOutboxRow,
} from '@/types/portal/notificaciones.types';

// Shape of the `_compra_resultado` RPC (the same one the checkout renders)
type CompraRow = {
  compra_id: string;
  tenant_id: string;
  estado: EventoCompraEstado;
  tickets:
    | {
        evento_nombre: string;
        fecha_hora: string | null;
        lugar: string | null;
        nombre_tenant: string;
        codigo: string;
        estado: EventoTicketEstado;
      }[]
    | null;
  cancelacion_antelacion_horas: number | null;
  total: number | string;
  entrada_nombre: string;
  comprador_nombre: string;
  comprador_email: string;
  created_at: string;
};

type CompraEmail = {
  eventoNombre: string;
  fechaHora: string | null;
  nombreTenant: string;
  entradaNombre: string;
  compradorNombre: string;
  total: number;
  motivoRechazo: string | null;
  codigos: string[];
  tickets: TicketPdfData[];
};

function texto(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function fechaTexto(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  return `${formatEventoFecha(fechaHora)} · ${formatEventoHora(fechaHora)} (hora de Bogotá)`;
}

function totalTexto(total: number): string {
  return total === 0 ? 'Gratis' : formatCop(total);
}

/**
 * Current state of the purchase, read at send time: a retry after the purchase moved on must not
 * email an outdated ticket. Event name, date and rejection reason come from the outbox snapshot.
 */
async function cargarCompra(row: NotificacionOutboxRow): Promise<CompraEmail | null> {
  if (!row.entidad_id) return null;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('_compra_resultado', { p_compra_id: row.entidad_id });
  if (error) throw new Error(`compra_load_failed:${error.code ?? 'unknown'}`);
  if (!data) return null;

  const compra = data as CompraRow;
  const total = Number(compra.total) || 0;
  const vivos = (compra.tickets ?? []).filter((ticket) => ticket.estado !== 'anulada');
  const payload = row.payload;

  return {
    eventoNombre: texto(payload.evento_nombre) || vivos[0]?.evento_nombre || 'Evento',
    fechaHora: texto(payload.fecha_hora) || null,
    nombreTenant: texto(payload.nombre_tenant),
    entradaNombre: compra.entrada_nombre,
    compradorNombre: compra.comprador_nombre,
    total,
    motivoRechazo: texto(payload.motivo_rechazo) || null,
    codigos: vivos.map((ticket) => ticket.codigo),
    tickets: vivos.map((ticket) => ({
      codigo: ticket.codigo,
      estado: ticket.estado,
      eventoNombre: ticket.evento_nombre,
      nombreTenant: ticket.nombre_tenant,
      fechaHora: ticket.fecha_hora,
      lugar: ticket.lugar,
      entradaNombre: compra.entrada_nombre,
      asistenteNombre: compra.comprador_nombre,
      asistenteEmail: compra.comprador_email,
      fechaCompra: compra.created_at,
      total,
      cancelacionAntelacionHoras: compra.cancelacion_antelacion_horas,
    })),
  };
}

/** One PDF, one page per live ticket (a "Múltiple" purchase has one per bundled event). */
async function adjuntoEntradas(tickets: TicketPdfData[]): Promise<NotificacionAdjunto[]> {
  const doc = await construirEntradasPdf(tickets);
  if (!doc) return [];
  return [{ filename: `entradas-${tickets[0].codigo}.pdf`, content: Buffer.from(doc.output('arraybuffer')) }];
}

type Contenido = {
  asunto: string;
  titulo: string;
  parrafos: string[];
  filas: [string, string | null][];
  cta?: { texto: string; url: string };
  adjuntos?: NotificacionAdjunto[];
};

function componer({ asunto, titulo, parrafos, filas, cta, adjuntos = [] }: Contenido): NotificacionEmail {
  const filasVisibles = filas.filter(([, valor]) => Boolean(valor));
  return {
    asunto,
    html: renderLayout({ titulo, cuerpoHtml: parrafos.map(renderParrafo).join('') + renderFilas(filas), cta }),
    texto: [
      titulo,
      '',
      ...parrafos,
      '',
      ...filasVisibles.map(([etiqueta, valor]) => `${etiqueta}: ${valor}`),
      ...(cta ? ['', `${cta.texto}: ${cta.url}`] : []),
    ].join('\n'),
    adjuntos,
  };
}

function filasCompra(compra: CompraEmail): [string, string | null][] {
  return [
    ['Evento', compra.eventoNombre],
    ['Fecha', fechaTexto(compra.fechaHora)],
    ['Organización', compra.nombreTenant || null],
    ['Entrada', compra.entradaNombre],
    ['Total', totalTexto(compra.total)],
    [compra.codigos.length === 1 ? 'Código' : 'Códigos', compra.codigos.join(', ') || null],
  ];
}

const compraRecibida: NotificacionHandler = async (row) => {
  const compra = await cargarCompra(row);
  if (!compra) return null;
  const adjuntos = await adjuntoEntradas(compra.tickets);
  return componer({
    asunto: `Recibimos tu compra — ${compra.eventoNombre}`,
    titulo: 'Recibimos tu compra',
    parrafos: [
      `Hola ${compra.compradorNombre}, recibimos tu compra y el organizador está validando el pago.`,
      adjuntos.length > 0
        ? 'Adjuntamos tu entrada marcada como PENDIENTE DE VALIDACIÓN: todavía no es válida para ingresar. Te enviaremos la entrada autorizada cuando el pago sea confirmado.'
        : 'Te enviaremos la entrada autorizada cuando el pago sea confirmado.',
    ],
    filas: filasCompra(compra),
    adjuntos,
  });
};

const compraConfirmada: NotificacionHandler = async (row) => {
  const compra = await cargarCompra(row);
  if (!compra) return null;
  const adjuntos = await adjuntoEntradas(compra.tickets);
  return componer({
    asunto: `Tu entrada para ${compra.eventoNombre}`,
    titulo: 'Compra confirmada',
    parrafos: [
      `Hola ${compra.compradorNombre}, tu compra está confirmada.`,
      adjuntos.length > 0
        ? 'Adjuntamos tu entrada con el código QR. Preséntala al ingresar al evento.'
        : 'Presenta tu código de acceso al ingresar al evento.',
    ],
    filas: filasCompra(compra),
    adjuntos,
  });
};

const compraRechazada: NotificacionHandler = async (row) => {
  const compra = await cargarCompra(row);
  if (!compra) return null;
  return componer({
    asunto: `Tu compra fue rechazada — ${compra.eventoNombre}`,
    titulo: 'Compra rechazada',
    parrafos: [
      `Hola ${compra.compradorNombre}, el organizador rechazó el pago de tu compra.`,
      'Si tienes una cuenta, puedes subir un nuevo comprobante desde "Mis entradas" en el portal.',
    ],
    filas: [
      ['Motivo', compra.motivoRechazo],
      ['Evento', compra.eventoNombre],
      ['Fecha', fechaTexto(compra.fechaHora)],
      ['Organización', compra.nombreTenant || null],
      ['Entrada', compra.entradaNombre],
      ['Total', totalTexto(compra.total)],
    ],
  });
};

const compraCancelada: NotificacionHandler = async (row) => {
  const compra = await cargarCompra(row);
  if (!compra) return null;
  return componer({
    asunto: `Compra cancelada — ${compra.eventoNombre}`,
    titulo: 'Compra cancelada',
    parrafos: [
      `Hola ${compra.compradorNombre}, tu compra fue cancelada y tus entradas ya no son válidas.`,
      'Si aplica un reembolso, lo gestiona directamente el organizador.',
    ],
    filas: [
      ['Evento', compra.eventoNombre],
      ['Fecha', fechaTexto(compra.fechaHora)],
      ['Organización', compra.nombreTenant || null],
      ['Entrada', compra.entradaNombre],
      ['Total', totalTexto(compra.total)],
    ],
  });
};

/** Administrators: built from the outbox snapshot, which says whether the purchase still needs validation. */
const compraNuevaAdmin: NotificacionHandler = async (row) => {
  const payload = row.payload;
  const tenantId = texto(payload.tenant_id);
  const eventoId = texto(payload.evento_id);
  if (!tenantId || !eventoId) return null;

  const eventoNombre = texto(payload.evento_nombre) || 'Evento';
  const porValidar = payload.estado === 'en_validacion';
  const titulo = porValidar ? 'Nueva compra por validar' : 'Nueva compra confirmada';

  return componer({
    asunto: `${titulo} — ${eventoNombre}`,
    titulo,
    parrafos: [
      porValidar
        ? 'Hay una compra esperando la validación del pago.'
        : 'Se registró una compra que quedó confirmada automáticamente.',
    ],
    filas: [
      ['Evento', eventoNombre],
      ['Comprador', texto(payload.comprador_nombre)],
      ['Entrada', texto(payload.entrada_nombre)],
      ['Total', totalTexto(Number(payload.total) || 0)],
      ['Estado', porValidar ? 'En validación' : 'Confirmada'],
    ],
    cta: {
      texto: porValidar ? 'Validar compra' : 'Ver compras',
      url: `${getAppUrl()}/portal/orgs/${tenantId}/gestion-eventos/${eventoId}/compras`,
    },
  });
};

export const eventosHandlers: Record<string, NotificacionHandler> = {
  'eventos.compra_recibida': compraRecibida,
  'eventos.compra_confirmada': compraConfirmada,
  'eventos.compra_rechazada': compraRechazada,
  'eventos.compra_cancelada': compraCancelada,
  'eventos.compra_nueva_admin': compraNuevaAdmin,
};
