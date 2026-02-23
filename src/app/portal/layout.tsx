import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { PortalHeader } from '@/components/portal/PortalHeader';
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
    redirect('/auth/login?next=/portal');
  }

  const cookieStore = await cookies();
  const roleCookie = cookieStore.get('portal_role')?.value;
  const profileCookie = cookieStore.get('portal_profile')?.value;

  let role: UserRole;
  let displayProfile: PortalDisplayProfile;

  const isRoleValid = roleCookie && VALID_ROLES.includes(roleCookie as UserRole);

  if (isRoleValid && profileCookie) {
    // Happy path: read everything from cookies — no DB call
    role = roleCookie as UserRole;
    try {
      displayProfile = JSON.parse(
        Buffer.from(profileCookie, 'base64').toString('utf-8'),
      ) as PortalDisplayProfile;
    } catch {
      redirect('/portal/bootstrap?next=/portal');
    }
  } else {
    redirect('/portal/bootstrap?next=/portal');
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-navy-deep text-slate-100">
      <PortalHeader profile={displayProfile} role={role} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
