'use client';

import { useState } from 'react';
import Link from 'next/link';
import { GritButton, GritIcon, cx, gritFocusRing } from '@/components/ui';
import { useSolicitudRequest } from '@/hooks/portal/gestion-solicitudes/useSolicitudRequest';
import { SolicitudEstadoBadge } from '@/components/portal/gestion-equipo/gestion-solicitudes/SolicitudEstadoBadge';

type SolicitarAccesoButtonProps = {
  tenantId: string;
  /** GritButton size (default `md`). */
  size?: 'sm' | 'md';
  /** Stretches the button and its panels to the container. */
  fullWidth?: boolean;
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

export function SolicitarAccesoButton({ tenantId, size = 'md', fullWidth = true }: SolicitarAccesoButtonProps) {
  const { solicitudes, loading, hasPending, rejectionCount, isBlocked, isProfileIncomplete, submit, submitting } =
    useSolicitudRequest({ tenantId });

  const [confirming, setConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) {
    return (
      <GritButton variant="secondary" size={size} fullWidth={fullWidth} disabled loading loadingLabel="Cargando…">
        Cargando…
      </GritButton>
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
    <div className={cx('flex flex-col gap-2', fullWidth && 'w-full')}>
      {confirming ? (
        <div className="flex w-full flex-col gap-2 rounded-[18px] border border-white/20 bg-grit-bg/70 p-2.5 backdrop-blur-[14px]">
          <p className="text-center font-grit-body text-xs text-grit-subtext">¿Confirmar solicitud?</p>
          <div className="flex gap-2">
            <GritButton
              size="sm"
              fullWidth
              className="flex-1"
              onClick={() => void handleSubmit()}
              loading={submitting}
              loadingLabel="Enviando…"
            >
              Confirmar
            </GritButton>
            <GritButton
              size="sm"
              variant="secondary"
              fullWidth
              className="flex-1"
              onClick={() => {
                setConfirming(false);
                setSubmitError(null);
              }}
            >
              Cancelar
            </GritButton>
          </div>
          {submitError ? (
            <p role="alert" className="text-center font-grit-body text-xs text-grit-danger">
              {submitError}
            </p>
          ) : null}
        </div>
      ) : (
        <GritButton
          size={size}
          variant={disabled ? 'secondary' : 'primary'}
          icon={disabled ? (isBlocked ? 'block' : hasPending ? 'hourglass_top' : 'person_alert') : 'how_to_reg'}
          fullWidth={fullWidth}
          disabled={disabled}
          onClick={() => setConfirming(true)}
        >
          {label}
        </GritButton>
      )}

      {isBlocked ? (
        <p className="text-center font-grit-body text-[11px] text-grit-muted">
          Has alcanzado el límite de solicitudes. Contacta a la organización directamente.
        </p>
      ) : null}

      {isProfileIncomplete ? (
        <div className="rounded-[14px] border border-grit-warning/30 bg-grit-warning/10 px-3 py-2.5 font-grit-body text-xs text-grit-warning" role="alert">
          <p>Esta organización requiere que completes tu perfil antes de solicitar acceso.</p>
          <Link
            href="/portal/perfil"
            className={cx('mt-1 inline-flex items-center gap-1 rounded-full font-semibold text-grit-cyan hover:underline', gritFocusRing)}
          >
            <GritIcon name="arrow_forward" size={12} />
            Completar perfil
          </Link>
        </div>
      ) : null}

      {hasHistory && !confirming ? (
        <button
          type="button"
          aria-expanded={historyOpen}
          onClick={() => setHistoryOpen(!historyOpen)}
          className={cx(
            'flex w-full items-center justify-center gap-1 rounded-full font-grit-body text-[11px] text-grit-muted hover:text-grit-subtext',
            gritFocusRing,
          )}
        >
          <GritIcon name={historyOpen ? 'expand_less' : 'expand_more'} size={12} />
          {historyOpen ? 'Ocultar historial' : 'Ver historial'}
        </button>
      ) : null}

      {hasHistory && historyOpen && !confirming ? (
        <div className="space-y-1.5 rounded-[14px] border border-white/[0.07] bg-grit-bg/70 p-2.5">
          {solicitudes.map((s) => (
            <div key={s.id} className="flex items-start gap-2 font-grit-body text-[11px]">
              <SolicitudEstadoBadge estado={s.estado} />
              <span className="text-grit-subtext">{formatDate(s.created_at)}</span>
              {s.nota_revision ? <span className="italic text-grit-muted">— {s.nota_revision}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
