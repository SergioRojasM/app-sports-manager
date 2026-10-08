import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { PortalHeader } from '@/components/portal/PortalHeader';
import { PortalSidebar } from '@/components/portal/PortalSidebar';
import { PortalNavigationProvider } from '@/components/portal/PortalNavigationProvider';
import { PortalBreadcrumb } from '@/components/portal/PortalBreadcrumb';
import { GritPageContainer } from '@/components/ui';
import type { UserRole, PortalDisplayProfile } from '@/types/portal.types';
import { VALID_ROLES } from '@/types/portal.types';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/portal/inicio');
  }

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get('portal_role')?.value;
  const profileCookie = cookieStore.get('portal_profile')?.value;

  let displayProfile: PortalDisplayProfile;

  const isRoleValid = roleCookie && VALID_ROLES.includes(roleCookie as UserRole);

  if (isRoleValid && profileCookie) {
    // Happy path: read everything from cookies — no DB call. The menu resolves the
    // per-tenant role itself (usePortalNavigation), so the role cookie only gates entry.
    try {
      displayProfile = JSON.parse(
        Buffer.from(profileCookie, 'base64').toString('utf-8'),
      ) as PortalDisplayProfile;
    } catch {
      redirect('/portal/bootstrap?next=/portal/inicio');
    }
  } else {
    redirect('/portal/bootstrap?next=/portal/inicio');
  }

  return (
    <PortalNavigationProvider>
      {/* Two-column shell: persistent sidebar ≥1024px, mobile drawer below it (US-0138) */}
      <div className="grit-shell flex h-screen overflow-hidden font-grit-body">
        <PortalSidebar profile={displayProfile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <PortalHeader profile={displayProfile} />
          <main id="portal-main" className="flex-1 overflow-y-auto">
            {/* Breadcrumb row (design `AOIa5`) scrolls with the content; page padding
                comes from GritPageContainer so every Portal page shares it (US-0116) */}
            <PortalBreadcrumb />
            <GritPageContainer>{children}</GritPageContainer>
          </main>
        </div>
      </div>
    </PortalNavigationProvider>
  );
}
