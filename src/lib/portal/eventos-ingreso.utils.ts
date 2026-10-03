import { EVENTOS_TIME_ZONE, formatEventoHora } from '@/lib/portal/eventos.utils';
import type { IngresoResultado, IngresoResultadoCodigo } from '@/types/portal/eventos-compras.types';

/** Same shape as the RPC check: 'EV-' + 8 chars without I, O, 0 or 1 (US-0131). */
const CODIGO_TICKET_REGEX = /^EV-[A-HJ-NP-Z2-9]{8}$/;

/**
 * Mirrors `_normalizar_codigo_ticket`: 'ev-abcd2345', 'EV ABCD2345', 'ABCD2345' → 'EV-ABCD2345'.
 * Returns the cleaned input (never null) so the field can show what was read.
 */
export function normalizarCodigoTicket(value: string): string {
  let raw = value.replace(/[\s-]/g, '').toUpperCase();
  if (raw.length === 10 && raw.startsWith('EV')) raw = raw.slice(2);
  return `EV-${raw}`;
}

export function esCodigoTicketValido(codigo: string): boolean {
  return CODIGO_TICKET_REGEX.test(codigo);
}

export type IngresoTone = 'success' | 'warning' | 'danger';

export type IngresoResultadoMeta = {
  tone: IngresoTone;
  icon: string;
  titulo: string;
  /** Second line, when the result carries more context. */
  detalle: string | null;
  /** "Deshacer ingreso" is offered for these results. */
  permiteDeshacer: boolean;
};

/** "7:05 p. m." in Bogotá, for check-in times. */
export function formatIngresoHora(iso: string): string {
  return formatEventoHora(iso);
}

/** "3 oct 7:05 p. m." in Bogotá, for check-in times in the purchases views. */
export function formatIngresoFechaHora(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: EVENTOS_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

const BASE: Record<IngresoResultadoCodigo, Omit<IngresoResultadoMeta, 'detalle'>> = {
  ok: { tone: 'success', icon: 'check_circle', titulo: 'Ingreso registrado', permiteDeshacer: true },
  ya_ingreso: { tone: 'warning', icon: 'history', titulo: 'Ya ingresó', permiteDeshacer: true },
  pendiente: { tone: 'warning', icon: 'hourglass_top', titulo: 'Pago pendiente de validación', permiteDeshacer: false },
  otro_evento: { tone: 'warning', icon: 'swap_horiz', titulo: 'Entrada de otro evento', permiteDeshacer: false },
  anulada: {
    tone: 'danger',
    icon: 'block',
    titulo: 'Entrada anulada — no válida para ingreso',
    permiteDeshacer: false,
  },
  no_encontrado: { tone: 'danger', icon: 'cancel', titulo: 'Código no encontrado', permiteDeshacer: false },
  revertido: { tone: 'warning', icon: 'undo', titulo: 'Ingreso revertido', permiteDeshacer: false },
};

export function ingresoResultadoMeta(resultado: IngresoResultado): IngresoResultadoMeta {
  const base = BASE[resultado.resultado];

  if (resultado.resultado === 'ya_ingreso' && resultado.ingresoAt) {
    return {
      ...base,
      titulo: `Ya ingresó a las ${formatIngresoHora(resultado.ingresoAt)}`,
      detalle: resultado.ingresoPorNombre ? `Registrado por ${resultado.ingresoPorNombre}` : null,
    };
  }
  if (resultado.resultado === 'otro_evento') {
    return { ...base, detalle: `Esta entrada es para ${resultado.eventoNombre ?? 'otro evento'}` };
  }

  return { ...base, detalle: null };
}

/** Local result for a malformed code, so no request is made. */
export function resultadoNoEncontrado(): IngresoResultado {
  return {
    resultado: 'no_encontrado',
    ticketId: null,
    codigo: null,
    asistenteNombre: null,
    asistenteEmail: null,
    entradaNombre: null,
    eventoNombre: null,
    ingresoAt: null,
    ingresoPorNombre: null,
  };
}
