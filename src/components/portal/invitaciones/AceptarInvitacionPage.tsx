'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAceptarInvitacion } from '@/hooks/portal/invitaciones/useAceptarInvitacion';
import { INVITACIONES_ERROR_MESSAGES } from '@/lib/portal/invitaciones-errors';
import type { InvitacionesErrorCode, InvitacionEstado } from '@/types/portal/invitaciones.types';

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
    <div className="glass mx-auto w-full max-w-lg rounded-2xl border border-portal-border p-8 text-center">
      <span className={`material-symbols-outlined text-5xl ${iconClass}`} aria-hidden="true">
        {icon}
      </span>
      <h2 className="mt-3 text-xl font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      {children ? <div className="mt-6 flex flex-col items-center gap-3">{children}</div> : null}
    </div>
  );
}

const volverLink = (
  <Link
    href="/portal/orgs"
    className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
  >
    Ir a organizaciones
  </Link>
);

const TERMINAL_STATES: Partial<Record<InvitacionEstado, { icon: string; iconClass: string; title: string; code: InvitacionesErrorCode }>> = {
  expirada: { icon: 'schedule', iconClass: 'text-orange-300', title: 'Invitación expirada', code: 'expired' },
  cancelada: { icon: 'block', iconClass: 'text-slate-400', title: 'Invitación cancelada', code: 'cancelled' },
  aceptada: { icon: 'check_circle', iconClass: 'text-emerald-300', title: 'Invitación aceptada', code: 'already_accepted' },
  fallida: { icon: 'error', iconClass: 'text-rose-300', title: 'Invitación no disponible', code: 'unexpected' },
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
      <div className="glass mx-auto w-full max-w-lg rounded-2xl border border-portal-border p-8 text-center text-sm text-slate-300">
        Cargando invitación...
      </div>
    );
  } else if (loadErrorCode === 'not_found') {
    content = (
      <StatusCard
        icon="mail_lock"
        iconClass="text-slate-400"
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
        iconClass="text-rose-300"
        title="No pudimos cargar la invitación"
        message={INVITACIONES_ERROR_MESSAGES[loadErrorCode ?? 'unexpected']}
      >
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90"
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
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90"
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
        iconClass="text-turquoise"
        title={`Te invitaron a ${invitacion.tenant_nombre}`}
        message={`Al aceptar te unirás a la organización con el rol de ${rolLabel}.`}
      >
        <p className="text-xs text-slate-500">Esta invitación vence el {expira}.</p>

        {acceptError ? (
          <div className="w-full rounded-lg border border-rose-400/25 bg-rose-900/20 p-3" role="alert">
            <p className="text-xs text-rose-200">{acceptError.message}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => void handleAceptar()}
          disabled={isAccepting}
          className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-5 py-2.5 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
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
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Invitación</h1>
        <p className="mt-2 text-sm text-slate-400">Revisa la invitación de la organización antes de unirte.</p>
      </header>
      {content}
    </section>
  );
}
