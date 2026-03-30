'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSolicitudRequest } from '@/hooks/portal/gestion-solicitudes/useSolicitudRequest';
import { SolicitudEstadoBadge } from '@/components/portal/gestion-equipo/gestion-solicitudes/SolicitudEstadoBadge';

type SolicitarAccesoButtonProps = {
  tenantId: string;
};

function formatDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function SolicitarAccesoButton({ tenantId }: SolicitarAccesoButtonProps) {
  const { solicitudes, loading, hasPending, rejectionCount, isBlocked, isProfileIncomplete, submit, submitting } =
    useSolicitudRequest({ tenantId });

  const [confirming, setConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex w-full items-center justify-center rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm font-semibold text-slate-400"
      >
        <span className="material-symbols-outlined mr-1.5 animate-spin text-sm" aria-hidden="true">
          progress_activity
        </span>
        Cargando...
      </button>
    );
  }

  async function handleSubmit() {
    setSubmitError(null);
    try {
      await submit();
      setConfirming(false);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al enviar la solicitud.');
    }
  }

  // Determine CTA label and state
  let label: string;
  let disabled: boolean;

  if (isBlocked) {
    label = 'Acceso bloqueado';
    disabled = true;
  } else if (isProfileIncomplete) {
    label = 'Perfil incompleto';
    disabled = true;
  } else if (hasPending) {
    label = 'Solicitud en revisión';
    disabled = true;
  } else if (rejectionCount > 0) {
    label = 'Volver a solicitar';
    disabled = false;
  } else {
    label = 'Solicitar acceso';
    disabled = false;
  }

  const hasHistory = solicitudes.length > 0;

  return (
    <div className="space-y-2">
      {/* Confirmation step */}
      {confirming ? (
        <div className="flex w-full flex-col gap-2">
          <p className="text-center text-xs text-slate-300">¿Confirmar solicitud?</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="flex-1 rounded-lg bg-turquoise px-3 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-1">
                  <span className="material-symbols-outlined animate-spin text-sm" aria-hidden="true">
                    progress_activity
                  </span>
                  Enviando...
                </span>
              ) : (
                'Confirmar'
              )}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setSubmitError(null); }}
              className="flex-1 rounded-lg border border-portal-border px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-navy-soft"
            >
              Cancelar
            </button>
          </div>
          {submitError ? (
            <p className="text-center text-xs text-rose-300">{submitError}</p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setConfirming(true)}
          className={[
            'inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition',
            disabled
              ? 'border border-portal-border bg-navy-deep text-slate-400 cursor-not-allowed'
              : 'border border-portal-border bg-navy-deep text-slate-200 hover:bg-navy-soft',
          ].join(' ')}
        >
          {label}
        </button>
      )}

      {/* Blocked message */}
      {isBlocked ? (
        <p className="text-center text-[11px] text-slate-500">
          Has alcanzado el límite de solicitudes. Contacta a la organización directamente.
        </p>
      ) : null}

      {/* Incomplete profile banner */}
      {isProfileIncomplete ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-3 py-2.5 text-xs text-amber-200" role="alert">
          <p>Esta organización requiere que completes tu perfil antes de solicitar acceso.</p>
          <Link
            href="/portal/perfil"
            className="mt-1 inline-flex items-center gap-1 font-semibold text-turquoise hover:underline"
          >
            <span className="material-symbols-outlined text-xs" aria-hidden="true">arrow_forward</span>
            Completar perfil
          </Link>
        </div>
      ) : null}

      {/* History toggle */}
      {hasHistory && !confirming ? (
        <button
          type="button"
          onClick={() => setHistoryOpen(!historyOpen)}
          className="flex w-full items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-400"
        >
          <span className="material-symbols-outlined text-xs" aria-hidden="true">
            {historyOpen ? 'expand_less' : 'expand_more'}
          </span>
          {historyOpen ? 'Ocultar historial' : 'Ver historial'}
        </button>
      ) : null}

      {/* History panel */}
      {hasHistory && historyOpen && !confirming ? (
        <div className="space-y-1.5 rounded-lg border border-portal-border bg-navy-deep/60 p-2.5">
          {solicitudes.map((s) => (
            <div key={s.id} className="flex items-start gap-2 text-[11px]">
              <SolicitudEstadoBadge estado={s.estado} />
              <span className="text-slate-400">{formatDate(s.created_at)}</span>
              {s.nota_revision ? (
                <span className="text-slate-500 italic">— {s.nota_revision}</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
