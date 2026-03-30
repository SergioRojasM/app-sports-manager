import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { getCachedTenantAccess } from '@/lib/portal/tenant-access.cache';

type SharedLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenant_id: string }>;
};

export default async function SharedLayout({ children, params }: SharedLayoutProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/orgs')}`);
  }

  const decision = await getCachedTenantAccess(supabase, user.id, tenantId);

  if (!decision.allowed || !decision.role) {
    redirect(`/portal/orgs/${tenantId}`);
  }

  return <>{children}</>;
}
