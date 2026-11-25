'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GritAvatar, GritIconButton, cx, gritFocusRing } from '@/components/ui';
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

/** User footer of the sidebar and the mobile drawer — v3 User Card `XLHCz` (US-0138, v3 US-0141). */
export function PortalSidebarUser({ profile, tenantRole, onNavigate }: PortalSidebarUserProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const fullName = `${profile.nombre} ${profile.apellido}`.trim();

  // Same flow as UserAvatarMenu's "Cerrar sesión"
  const handleLogout = async () => {
    onNavigate?.();
    await signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.07] bg-white/[0.03] py-2 pl-2 pr-2.5">
      <Link
        href="/portal/perfil"
        onClick={onNavigate}
        className={cx('flex min-w-0 flex-1 items-center gap-2.5 rounded-[14px] p-1 transition-colors hover:bg-white/[0.04]', gritFocusRing)}
      >
        <GritAvatar name={fullName} src={profile.foto_url} size={32} tone="soft" />
        <span className="flex min-w-0 flex-col gap-0.5 font-grit-body">
          <span className="truncate text-[13px] font-semibold text-grit-text">{fullName}</span>
          <span className={cx('truncate text-[10px]', tenantRole ? 'text-grit-cyan' : 'text-grit-muted')}>
            {tenantRole ? ROLE_LABELS[tenantRole] : profile.email}
          </span>
        </span>
      </Link>
      <GritIconButton
        icon="logout"
        label="Cerrar sesión"
        size="sm"
        variant="ghost"
        onClick={handleLogout}
        className="bg-transparent hover:bg-grit-danger/10 hover:text-grit-danger"
      />
    </div>
  );
}
