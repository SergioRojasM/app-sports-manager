'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAceptarInvitacion } from '@/hooks/portal/invitaciones/useAceptarInvitacion';
import { INVITACIONES_ERROR_MESSAGES } from '@/lib/portal/invitaciones-errors';
import type { InvitacionesErrorCode, InvitacionEstado } from '@/types/portal/invitaciones.types';
import { GritPageHeader } from '@/components/ui';

const ROL_DISPLAY_LABELS: Record<string, string> = {
  usuario: 'Atleta',
  administrador: 'Administrador',
  entrenador: 'Entrenador',
};

type AceptarInvitacionPageProps = {
  invitacionId: string;
};

type StatusCardProps = {
  icon: string;
  iconClass: string;
  title: string;
  message: string;
  children?: React.ReactNode;
};

function StatusCard({ icon, iconClass, title, message, children }: StatusCardProps) {
  return (
    <div className="border bg-grit-glass backdrop-blur-md mx-auto w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-8 text-center">
      <span className={`material-symbols-outlined text-5xl ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <h2 className="font-grit-title mt-3 text-xl font-semibold text-grit-text">{title}</h2>
      <p className="mt-2 text-sm text-grit-subtext">{message}</p>
      {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
    </div>
  );
}

const volverLink = (
  <Link
    href="/portal/orgs"
    className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
  >
    Ir a organizaciones
  </Link>
);

const TERMINAL_STATES: Partial<Record<InvitacionEstado, { icon: string; iconClass: string; title: string; code: InvitacionesErrorCode }>> = {
  expirada: { icon: 'schedule', iconClass: 'text-orange-300', title: 'Invitación expirada', code: 'expired' },
  cancelada: { icon: 'block', iconClass: 'text-grit-subtext', title: 'Invitación cancelada', code: 'cancelled' },
  aceptada: { icon: 'check_circle', iconClass: 'text-emerald-300', title: 'Invitación aceptada', code: 'already_accepted' },
  fallida: { icon: 'error', iconClass: 'text-grit-danger', title: 'Invitación no disponible', code: 'unexpected' },
};

export function AceptarInvitacionPage({ invitacionId }: AceptarInvitacionPageProps) {
  const router = useRouter();
  const { invitacion, loading, loadErrorCode, isAccepting, acceptError, aceptar, reload } =
    useAceptarInvitacion(invitacionId);

  async function handleAceptar() {
    const result = await aceptar();
    if (result) {
      router.push(`/portal/orgs/${result.tenant_id}`);
      router.refresh();
    }
  }

  let content: React.ReactNode;

  if (loading) {
    content = (
      <div className="border bg-grit-glass backdrop-blur-md mx-auto w-full max-w-lg rounded-grit-2xl border-grit-glass-border p-8 text-center text-sm text-grit-subtext">
        Cargando invitación...
      </div>
    );
  } else if (loadErrorCode === 'not_found') {
    content = (
      <StatusCard
        icon="mail_lock"
        iconClass="text-grit-subtext"
        title="Invitación no encontrada"
        message="Esta invitación no existe o fue enviada a otro correo electrónico. Verifica que iniciaste sesión con el correo que recibió la invitación."
      >
        {volverLink}
      </StatusCard>
    );
  } else if (loadErrorCode || !invitacion) {
    content = (
      <StatusCard
        icon="error"
        iconClass="text-grit-danger"
        title="No pudimos cargar la invitación"
        message={INVITACIONES_ERROR_MESSAGES[loadErrorCode ?? 'unexpected']}
      >
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90"
        >
          Reintentar
        </button>
      </StatusCard>
    );
  } else if (TERMINAL_STATES[invitacion.estado]) {
    const terminal = TERMINAL_STATES[invitacion.estado]!;
    content = (
      <StatusCard
        icon={terminal.icon}
        iconClass={terminal.iconClass}
        title={terminal.title}
        message={INVITACIONES_ERROR_MESSAGES[terminal.code]}
      >
        {invitacion.estado === 'aceptada' ? (
          <Link
            href={`/portal/orgs/${invitacion.tenant_id}`}
            className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90"
          >
            Ir a {invitacion.tenant_nombre}
          </Link>
        ) : (
          volverLink
        )}
      </StatusCard>
    );
  } else {
    const rolLabel = ROL_DISPLAY_LABELS[invitacion.rol_nombre.toLowerCase()] ?? invitacion.rol_nombre;
    const expira = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(new Date(invitacion.expires_at));

    content = (
      <StatusCard
        icon="group_add"
        iconClass="text-grit-cyan"
        title={`Te invitaron a ${invitacion.tenant_nombre}`}
        message={`Al aceptar te unirás a la organización con el rol de ${rolLabel}.`}
      >
        <p className="text-xs text-grit-muted">Esta invitación vence el {expira}.</p>

        {acceptError ? (
          <div className="w-full rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3" role="alert">
            <p className="text-xs text-grit-danger">{acceptError.message}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleAceptar()}
          disabled={isAccepting}
          className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-5 py-2.5 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
          {isAccepting ? 'Aceptando…' : 'Aceptar invitación'}
        </button>
        {volverLink}
      </StatusCard>
    );
  }

  return (
    <section className="space-y-6">
      <GritPageHeader title="Invitación" subtitle="Revisa la invitación de la organización antes de unirte." />
      {content}
    </section>
  );
}
