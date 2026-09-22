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
    <section aria-labelledby="invitaciones-pendientes-title" className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-cyan/30 p-5">
      <h2 id="invitaciones-pendientes-title" className="font-grit-title flex items-center gap-2 text-lg font-semibold text-grit-text">
        <span className="material-symbols-outlined text-grit-cyan" aria-hidden="true">mail</span>
        Invitaciones pendientes
      </h2>
      <ul className="mt-3 divide-y divide-grit-glass-border">
        {invitaciones.map((invitacion) => (
          <li key={invitacion.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium text-grit-text">{invitacion.tenant_nombre}</p>
              <p className="text-xs text-grit-subtext">
                Rol: {ROL_DISPLAY_LABELS[invitacion.rol_nombre.toLowerCase()] ?? invitacion.rol_nombre} · Vence el{' '}
                {DATE_FORMATTER.format(new Date(invitacion.expires_at))}
              </p>
            </div>
            <Link
              href={`/portal/invitaciones/${invitacion.id}`}
              className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90"
            >
              Aceptar
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
