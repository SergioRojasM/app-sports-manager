import { formatCop, formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import type { jsPDF } from 'jspdf';
import type { TicketPdfData } from '@/types/portal/eventos-compras.types';

/** Cancellation policy line shown in the checkout, the PDF and "Mis Entradas" (US-0121). */
export function politicaCancelacionTexto(horas: number | null): string {
  if (horas === null) return 'Esta entrada no admite cancelación ni reembolso.';
  return `Puedes cancelar hasta ${horas} h antes del evento. El reembolso lo gestiona el organizador.`;
}

// jsPDF's standard fonts are WinAnsi: no em dash, and NBSP from Intl renders oddly
function pdfText(value: string): string {
  return value.replace(/[–—]/g, '-').replace(/[  ]/g, ' ');
}

function fechaHoraTexto(fechaHora: string | null): string {
  if (!fechaHora) return 'Fecha por definir';
  return `${formatEventoFecha(fechaHora)} · ${formatEventoHora(fechaHora)} (hora de Bogotá)`;
}

function fechaCompraTexto(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

const COLORS = {
  band: [11, 18, 32] as const,
  cyan: [34, 211, 238] as const,
  text: [17, 24, 39] as const,
  muted: [100, 116, 139] as const,
  danger: [190, 18, 60] as const,
  success: [5, 150, 105] as const,
};

/**
 * Builds the ticket PDF (A5 portrait, one page per ticket), or `null` when no ticket is left to draw.
 * Only `activa` tickets carry a QR code; `pendiente` ones are marked as not valid for entry.
 * No DOM API is used, so the same code draws the browser download and the emailed attachment (US-0125).
 */
export async function construirEntradasPdf(tickets: TicketPdfData[]): Promise<jsPDF | null> {
  const validos = tickets.filter((ticket) => ticket.estado !== 'anulada');
  if (validos.length === 0) return null;

  // Loaded on demand so neither library lands in the page bundles
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')]);

  const doc = new jsPDF({ format: 'a5', unit: 'mm', orientation: 'portrait', compress: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  for (const [index, ticket] of validos.entries()) {
    if (index > 0) doc.addPage('a5', 'portrait');

    if (ticket.estado !== 'activa') {
      // Diagonal watermark drawn first so the content stays readable on top of it
      doc.setTextColor(254, 226, 226);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(pdfText('PENDIENTE DE VALIDACIÓN'), pageWidth / 2 - 40, pageHeight / 2 + 40, { angle: 35 });
    }

    // Header band
    doc.setFillColor(...COLORS.band);
    doc.rect(0, 0, pageWidth, 26, 'F');
    doc.setTextColor(...COLORS.cyan);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('GRIT Arena', margin, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(pdfText(ticket.nombreTenant || 'Organización'), margin, 19);
    doc.setFontSize(8);
    doc.text('ENTRADA', pageWidth - margin, 12, { align: 'right' });

    let y = 38;

    // Event
    doc.setTextColor(...COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    const nombreLines = doc.splitTextToSize(pdfText(ticket.eventoNombre), contentWidth) as string[];
    doc.text(nombreLines, margin, y);
    y += nombreLines.length * 7 + 1;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.muted);
    doc.text(pdfText(fechaHoraTexto(ticket.fechaHora)), margin, y);
    y += 5.5;
    if (ticket.lugar) {
      const lugarLines = doc.splitTextToSize(pdfText(ticket.lugar), contentWidth) as string[];
      doc.text(lugarLines, margin, y);
      y += lugarLines.length * 5;
    }

    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Ticket details
    const detalle: [string, string][] = [
      ['Entrada', ticket.entradaNombre],
      ['Asistente', ticket.asistenteNombre],
      ['Correo', ticket.asistenteEmail],
      ['Fecha de compra', fechaCompraTexto(ticket.fechaCompra)],
      ['Total pagado', ticket.total === 0 ? 'Gratis' : formatCop(ticket.total)],
    ];
    doc.setFontSize(9);
    for (const [label, value] of detalle) {
      doc.setTextColor(...COLORS.muted);
      doc.setFont('helvetica', 'normal');
      doc.text(label, margin, y);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'bold');
      doc.text(pdfText(value), margin + 34, y, { maxWidth: contentWidth - 34 });
      y += 6;
    }

    // Code
    y += 4;
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CÓDIGO DE ACCESO', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setTextColor(...COLORS.text);
    doc.setFont('courier', 'bold');
    doc.setFontSize(22);
    doc.text(ticket.codigo, pageWidth / 2, y, { align: 'center' });
    y += 6;

    if (ticket.estado === 'activa') {
      const qrSize = 48;
      const qr = await QRCode.toDataURL(ticket.codigo, { margin: 1, width: 320, errorCorrectionLevel: 'M' });
      doc.addImage(qr, 'PNG', (pageWidth - qrSize) / 2, y, qrSize, qrSize, undefined, 'FAST');
      y += qrSize + 6;
      doc.setTextColor(...COLORS.success);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Entrada válida', pageWidth / 2, y, { align: 'center' });
    } else {
      // Pending: no QR, a clear banner (the watermark is drawn under the content)
      y += 4;
      doc.setFillColor(...COLORS.danger);
      doc.rect(margin, y, contentWidth, 14, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('PENDIENTE DE VALIDACIÓN', pageWidth / 2, y + 6, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('No válida para ingreso', pageWidth / 2, y + 11, { align: 'center' });

    }

    // Footer: cancellation policy
    doc.setTextColor(...COLORS.muted);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const politica = doc.splitTextToSize(pdfText(politicaCancelacionTexto(ticket.cancelacionAntelacionHoras)), contentWidth) as string[];
    doc.text(politica, margin, pageHeight - 14);
  }

  return doc;
}

/** Builds the ticket PDF in the browser and triggers the download. */
export async function descargarEntradasPdf(tickets: TicketPdfData[], fileName: string): Promise<void> {
  const doc = await construirEntradasPdf(tickets);
  doc?.save(fileName);
}
