import type {
  CompraResultado,
  EntradaVendible,
  EventoCompraEstado,
  MiCompra,
  TicketPdfData,
} from '@/types/portal/eventos-compras.types';
import type { FormularioPerfilCampo } from '@/types/portal/formularios.types';

// ─── Sellability (the server re-validates everything) ───

/** Inside the ticket's `[valida_desde, valida_hasta]` window. */
export function entradaVendible(entrada: EntradaVendible, now: Date = new Date()): boolean {
  const time = now.getTime();
  if (entrada.validaDesde && time < new Date(entrada.validaDesde).getTime()) return false;
  if (entrada.validaHasta && time > new Date(entrada.validaHasta).getTime()) return false;
  return true;
}

/** Sale closes `reserva_antelacion_horas` before the event starts. */
export function ventaCerradaPorAntelacion(
  evento: { fechaHora: string | null; reservaAntelacionHoras: number | null },
  now: Date = new Date(),
): boolean {
  if (!evento.fechaHora || evento.reservaAntelacionHoras === null) return false;
  const limite = new Date(evento.fechaHora).getTime() - evento.reservaAntelacionHoras * 3_600_000;
  return now.getTime() > limite;
}

/**
 * Same rule as `cancelar_compra_evento` (UI only): never once a ticket was used at the door (US-0131);
 * null policy → never; otherwise until `fecha_hora − N h`.
 */
export function puedeCancelarCompra(
  compra: {
    estado: EventoCompraEstado;
    cancelacionAntelacionHoras: number | null;
    fechaHora: string | null;
    algunTicketUsado?: boolean;
  },
  now: Date = new Date(),
): boolean {
  if (compra.estado !== 'en_validacion' && compra.estado !== 'confirmada') return false;
  if (compra.algunTicketUsado) return false;
  if (compra.cancelacionAntelacionHoras === null) return false;
  if (!compra.fechaHora) return true;
  const limite = new Date(compra.fechaHora).getTime() - compra.cancelacionAntelacionHoras * 3_600_000;
  return now.getTime() <= limite;
}

/** Purchase is still pending its 30-minute capacity hold. */
export const COMPRA_HOLD_MS = 30 * 60 * 1000;

export function compraHoldVigente(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() < COMPRA_HOLD_MS;
}

// ─── Buyer data ───

/** Profile keys already covered by the fixed checkout fields; never asked twice. */
export const PERFIL_CAMPOS_FIJOS: readonly FormularioPerfilCampo[] = ['nombre', 'apellido', 'fecha_nacimiento'];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function esEmailValido(email: string): boolean {
  const value = email.trim();
  return value.length > 0 && value.length <= 254 && EMAIL_RE.test(value);
}

/** A past date after 1900-01-01 (`YYYY-MM-DD`). */
export function esFechaNacimientoValida(value: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(now);
  return value > '1900-01-01' && value < today;
}

// ─── Files ───

export const COMPROBANTE_TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const COMPROBANTE_ACCEPT = COMPROBANTE_TIPOS.join(',');
export const IMAGEN_FORMULARIO_TIPOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ARCHIVO_COMPRA_MAX_BYTES = 5 * 1024 * 1024;

/** Error message for an invalid proof, or null when it is acceptable. */
export function validarComprobante(file: File): string | null {
  if (!(COMPROBANTE_TIPOS as readonly string[]).includes(file.type)) {
    return 'El comprobante debe ser una imagen JPEG, PNG o WebP, o un PDF.';
  }
  if (file.size > ARCHIVO_COMPRA_MAX_BYTES) {
    return 'El comprobante no puede superar 5 MB.';
  }
  return null;
}

/** Error message for an invalid form image, or null when it is acceptable. */
export function validarImagenFormulario(file: File): string | null {
  if (!(IMAGEN_FORMULARIO_TIPOS as readonly string[]).includes(file.type)) {
    return 'La imagen debe ser JPEG, PNG o WebP.';
  }
  if (file.size > ARCHIVO_COMPRA_MAX_BYTES) {
    return 'La imagen no puede superar 5 MB.';
  }
  return null;
}

export function formatTamanoArchivo(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

// ─── Misc ───

export function slugify(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'evento'
  );
}

export function nombreArchivoPdf(eventoNombre: string, codigo: string): string {
  return `entrada-${slugify(eventoNombre)}-${codigo}.pdf`;
}

/** Purchases of events that have not started yet (or undated) go under "Próximas". */
export function esCompraProxima(compra: MiCompra, now: Date = new Date()): boolean {
  const fechaHora = compra.evento?.fechaHora ?? null;
  return !fechaHora || new Date(fechaHora).getTime() >= now.getTime();
}

/** PDF download is offered once files are in and at least one ticket is still valid or pending. */
export function puedeDescargarPdf(compra: Pick<MiCompra, 'estado' | 'tickets'>): boolean {
  return compra.estado !== 'pendiente_pago' && compra.tickets.some((ticket) => ticket.estado !== 'anulada');
}

// ─── PDF view models ───

export function compraResultadoToPdf(resultado: CompraResultado): TicketPdfData[] {
  return resultado.tickets
    .filter((ticket) => ticket.estado !== 'anulada')
    .map((ticket) => ({
      codigo: ticket.codigo,
      estado: ticket.estado,
      eventoNombre: ticket.eventoNombre,
      nombreTenant: ticket.nombreTenant,
      fechaHora: ticket.fechaHora,
      lugar: ticket.lugar,
      entradaNombre: resultado.entradaNombre,
      asistenteNombre: resultado.compradorNombre,
      asistenteEmail: resultado.compradorEmail,
      fechaCompra: resultado.createdAt,
      total: resultado.total,
      cancelacionAntelacionHoras: resultado.cancelacionAntelacionHoras,
    }));
}

export function miCompraToPdf(compra: MiCompra): TicketPdfData[] {
  return compra.tickets
    .filter((ticket) => ticket.estado !== 'anulada')
    .map((ticket) => {
      const esPrincipal = ticket.eventoId === compra.eventoId;
      return {
        codigo: ticket.codigo,
        estado: ticket.estado,
        eventoNombre: ticket.eventoNombre ?? (esPrincipal ? compra.evento?.nombre : null) ?? 'Evento',
        nombreTenant: ticket.nombreTenant ?? compra.evento?.nombreTenant ?? '',
        fechaHora: ticket.fechaHora ?? (esPrincipal ? (compra.evento?.fechaHora ?? null) : null),
        lugar: ticket.lugar ?? (esPrincipal ? (compra.evento?.lugar ?? null) : null),
        entradaNombre: compra.entradaNombre,
        asistenteNombre: ticket.asistenteNombre,
        asistenteEmail: ticket.asistenteEmail,
        fechaCompra: compra.createdAt,
        total: compra.total,
        cancelacionAntelacionHoras: compra.evento?.cancelacionAntelacionHoras ?? null,
      };
    });
}
