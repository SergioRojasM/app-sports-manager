import Link from 'next/link';
import { GritButton, GritCard, GritSectionHeading, GritTag, cx, gritFocusRing } from '@/components/ui';
import type { InicioMembresia } from '@/types/portal/inicio.types';
import { InicioOrgLogo } from './InicioOrgLogo';
import { InicioPanelEmpty } from './InicioPanelEmpty';

const ROL_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  entrenador: 'Entrenador',
  usuario: 'Atleta',
  atleta: 'Atleta',
};

function rolLabel(rol: string): string {
  const key = rol.trim().toLowerCase();
  return ROL_LABELS[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Miembro');
}

/** "Mis organizaciones" panel of `/portal/inicio` (frame `lhbhK` › `qLx9S`). */
export function InicioOrganizaciones({ membresias }: { membresias: InicioMembresia[] }) {
  return (
    <GritCard variant="card" padding="none" className="flex min-w-0 flex-col gap-3.5 rounded-grit-3xl p-[22px]">
      <GritSectionHeading
        title="Mis organizaciones"
        size="md"
        className="items-center"
        action={
          <GritButton href="/portal/orgs" variant="secondary" size="sm" icon="arrow_forward" iconPosition="end">
            Ver todas
          </GritButton>
        }
      />

      {membresias.length === 0 ? (
        <InicioPanelEmpty
          icon="corporate_fare"
          title="No perteneces a ninguna organización"
          action={
            <GritButton href="/portal/orgs" variant="secondary" size="sm">
              Explorar organizaciones
            </GritButton>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {membresias.map((m) => (
            <li key={m.tenant_id}>
              <Link
                href={`/portal/orgs/${m.tenant_id}`}
                className={cx(
                  'flex items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 transition-colors hover:bg-white/[0.05]',
                  gritFocusRing,
                )}
              >
                <InicioOrgLogo nombre={m.org_nombre} logoUrl={m.org_logo} />
                <span className="min-w-0 flex-1 truncate font-grit-body text-sm font-semibold text-grit-text">
                  {m.org_nombre}
                </span>
                <GritTag>{rolLabel(m.rol_nombre)}</GritTag>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GritCard>
  );
}
