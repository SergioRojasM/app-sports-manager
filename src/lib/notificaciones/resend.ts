import 'server-only';
import { Resend } from 'resend';
import type { NotificacionAdjunto } from '@/types/portal/notificaciones.types';

/** Failure with a short code that is safe to store and log (never an address or a payload). */
export class EnvioEmailError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = 'EnvioEmailError';
    this.code = code;
  }
}

type EnviarEmailInput = {
  para: string;
  asunto: string;
  html: string;
  texto: string;
  adjuntos: NotificacionAdjunto[];
  /** Outbox row id: a retry of the same row is never delivered twice by the provider. */
  idempotencyKey: string;
};

const DEFAULT_FROM = 'GRIT Arena <no-reply@grit-arena.com>';

/** "Name <address>" or a bare address → the sender shape Mailpit expects. */
function parseFrom(from: string): { Email: string; Name?: string } {
  const match = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  return match ? { Email: match[2].trim(), Name: match[1].replace(/^"|"$/g, '') || undefined } : { Email: from.trim() };
}

/**
 * Development only: delivers to the local Mailpit (the Supabase CLI mail catcher) through its HTTP
 * API, so nothing leaves the machine and any test address is safe.
 */
async function enviarAMailpit(baseUrl: string, input: EnviarEmailInput): Promise<{ id: string }> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/v1/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        From: parseFrom(process.env.EMAIL_FROM || DEFAULT_FROM),
        To: [{ Email: input.para }],
        Subject: input.asunto,
        HTML: input.html,
        Text: input.texto,
        Attachments: input.adjuntos.map((adjunto) => ({
          Filename: adjunto.filename,
          Content: adjunto.content.toString('base64'),
        })),
      }),
    });
  } catch {
    throw new EnvioEmailError('mailpit_unreachable');
  }

  if (!response.ok) throw new EnvioEmailError(`mailpit_http_${response.status}`);
  const data = (await response.json().catch(() => null)) as { ID?: string } | null;
  return { id: `mailpit:${data?.ID ?? 'unknown'}` };
}

export async function enviarEmail(input: EnviarEmailInput): Promise<{ id: string }> {
  // Never honoured in production, where a leftover value would silently swallow every email
  const mailpitUrl = process.env.NODE_ENV === 'production' ? undefined : process.env.EMAIL_DEV_MAILPIT_URL;
  if (mailpitUrl) return enviarAMailpit(mailpitUrl, input);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // Local development: show what would have been sent, without the recipient
    console.info(`[notificaciones] resend not configured — "${input.asunto}" (${input.idempotencyKey})`);
    throw new EnvioEmailError('resend_not_configured');
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.para,
      subject: input.asunto,
      html: input.html,
      text: input.texto,
      attachments: input.adjuntos.map((adjunto) => ({ filename: adjunto.filename, content: adjunto.content })),
    },
    { idempotencyKey: input.idempotencyKey },
  );

  if (error || !data) {
    throw new EnvioEmailError(`resend_${error?.name ?? 'unknown_error'}`);
  }
  return { id: data.id };
}
