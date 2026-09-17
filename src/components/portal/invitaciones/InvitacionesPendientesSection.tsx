'use client';

import Link from 'next/link';
import { useMisInvitaciones } from '@/hooks/portal/invitaciones/useMisInvitaciones';

const ROL_DISPLAY_LABELS: Record<string, string> = {
  usuario: 'Atleta',
  administrador: 'Administrador',
  entrenador: 'Entrenador',
};

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export function InvitacionesPendientesSection() {
  const { invitaciones, loading } = useMisInvitaciones();

  if (loading || invitaciones.length === 0) return null;

  return (
    <section aria-labelledby="invitaciones-pendientes-title" className="glass rounded-lg border border-turquoise/30 p-5">
      <h2 id="invitaciones-pendientes-title" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <span className="material-symbols-outlined text-turquoise" aria-hidden="true">mail</span>
        Invitaciones pendientes
      </h2>
      <ul className="mt-3 divide-y divide-portal-border">
        {invitaciones.map((invitacion) => (
          <li key={invitacion.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-slate-100">{invitacion.tenant_nombre}</p>
              <p className="text-xs text-slate-400">
                Rol: {ROL_DISPLAY_LABELS[invitacion.rol_nombre.toLowerCase()] ?? invitacion.rol_nombre} · Vence el{' '}
                {DATE_FORMATTER.format(new Date(invitacion.expires_at))}
              </p>
            </div>
            <Link
              href={`/portal/invitaciones/${invitacion.id}`}
              className="rounded-lg bg-turquoise px-4 py-2 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90"
            >
              Aceptar
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
