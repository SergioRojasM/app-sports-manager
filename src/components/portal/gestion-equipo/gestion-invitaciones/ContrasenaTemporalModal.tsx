'use client';

import { useState } from 'react';

type ContrasenaTemporalModalProps = {
  email: string;
  contrasenaTemporal: string;
  onClose: () => void;
};

/**
 * One-time reveal of a provisioned account's temporary password. It cannot be dismissed
 * until the administrator acknowledges the delivery rule, and the parent drops the password
 * from state on close so it can never be shown again.
 */
export function ContrasenaTemporalModal({ email, contrasenaTemporal, onClose }: ContrasenaTemporalModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(contrasenaTemporal);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrasena-temporal-title"
    >
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-portal-border bg-navy-deep p-6 shadow-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15">
          <span className="material-symbols-outlined text-2xl text-emerald-300" aria-hidden="true">key</span>
        </div>

        <h2 id="contrasena-temporal-title" className="mb-1 text-center text-lg font-semibold text-slate-100">
          Cuenta creada
        </h2>
        <p className="mb-4 text-center text-sm text-slate-400">
          <span className="font-medium text-slate-200">{email}</span> quedó pendiente de activación.
        </p>

        <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="contrasena-temporal-valor">
          Contraseña temporal
        </label>
        <div className="flex items-stretch gap-2">
          <output
            id="contrasena-temporal-valor"
            className="flex-1 select-all break-all rounded-lg border border-portal-border bg-navy-medium px-3 py-2 font-mono text-base tracking-wide text-slate-100"
          >
            {contrasenaTemporal}
          </output>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded-lg border border-portal-border px-3 text-xs font-semibold text-slate-200 transition hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copiada' : 'Copiar'}
          </button>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-900/20 p-3 text-xs text-amber-200">
          <span className="material-symbols-outlined text-base" aria-hidden="true">visibility_off</span>
          <span>
            Esta es la única vez que verás esta contraseña. No se guarda en el sistema. La persona deberá cambiarla al
            iniciar sesión para activar su membresía.
          </span>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-portal-border bg-navy-medium accent-turquoise"
          />
          Compartiré esta contraseña por un canal aprobado
        </label>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={!acknowledged}
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
