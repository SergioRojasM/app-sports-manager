import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { tenantService } from '@/services/supabase/portal/tenant.service';

type TenantLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenant_id: string }>;
};

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/orgs')}`);
  }

  const decision = await tenantService.canUserAccessTenant(supabase, user.id, tenantId);

  if (!decision.allowed || !decision.role) {
    redirect('/portal/orgs');
  }

  return <>{children}</>;
}
