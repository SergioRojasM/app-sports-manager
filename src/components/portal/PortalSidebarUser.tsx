'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { useAuth } from '@/hooks/auth/useAuth';
import type { PortalDisplayProfile, UserRole } from '@/types/portal.types';

const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  entrenador: 'Entrenador',
  usuario: 'Atleta',
};

type PortalSidebarUserProps = {
  profile: PortalDisplayProfile;
  /** Per-tenant role; null outside a tenant, where the email is shown instead. */
  tenantRole: UserRole | null;
  onNavigate?: () => void;
};

/** User footer of the sidebar and the mobile drawer (US-0138). */
export function PortalSidebarUser({ profile, tenantRole, onNavigate }: PortalSidebarUserProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const fullName = `${profile.nombre} ${profile.apellido}`.trim();
  const initials = `${profile.nombre?.[0] ?? ''}${profile.apellido?.[0] ?? ''}`.toUpperCase();

  // Same flow as UserAvatarMenu's "Cerrar sesión"
  const handleLogout = async () => {
    onNavigate?.();
    await signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-3 px-1">
      <Link
        href="/portal/perfil"
        onClick={onNavigate}
        className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-grit-md p-1 transition-colors hover:bg-grit-cyan/5', gritFocusRing)}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-grit-glass-border bg-grit-cyan/10">
          {profile.foto_url ? (
            <Image src={profile.foto_url} alt="" width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            <span className="font-grit-body text-xs font-bold text-grit-cyan">
              {initials || <GritIcon name="person" size={16} />}
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 font-grit-body">
          <span className="truncate text-[13px] font-semibold text-grit-text">{fullName}</span>
          <span className="truncate text-[11px] text-grit-subtext">
            {tenantRole ? ROLE_LABELS[tenantRole] : profile.email}
          </span>
        </span>
      </Link>
      <button
        type="button"
        aria-label="Cerrar sesión"
        onClick={handleLogout}
        className={cx(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-grit-md text-grit-subtext transition-colors hover:bg-grit-danger/10 hover:text-grit-danger',
          gritFocusRing,
        )}
      >
        <GritIcon name="logout" size={18} />
      </button>
    </div>
  );
}
