import 'server-only';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type LayoutInput = {
  titulo: string;
  /** Already-escaped HTML. */
  cuerpoHtml: string;
  cta?: { texto: string; url: string };
};

/** Label / value rows used by every email. Values are escaped here. */
export function renderFilas(filas: [string, string | null | undefined][]): string {
  const rows = filas
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(
      ([etiqueta, valor]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#64748b;font-size:14px;vertical-align:top;white-space:nowrap">${escapeHtml(etiqueta)}</td>` +
        `<td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600">${escapeHtml(valor)}</td></tr>`,
    )
    .join('');
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0">${rows}</table>`;
}

export function renderParrafo(texto: string): string {
  return `<p style="margin:0 0 12px;color:#111827;font-size:15px;line-height:1.5">${escapeHtml(texto)}</p>`;
}

/** Shared branded layout: table-based and inline-styled, as email clients require. */
export function renderLayout({ titulo, cuerpoHtml, cta }: LayoutInput): string {
  const boton = cta
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(cta.url)}" style="display:inline-block;background:#0b1220;color:#22d3ee;` +
      `font-size:14px;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">${escapeHtml(cta.texto)}</a></p>`
    : '';

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0b1220;padding:18px 24px;color:#22d3ee;font-size:18px;font-weight:700">GRIT Arena</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 16px;color:#111827;font-size:20px;line-height:1.3">${escapeHtml(titulo)}</h1>
${cuerpoHtml}${boton}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.5">
Este es un mensaje automático de GRIT Arena. No respondas a este correo.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
