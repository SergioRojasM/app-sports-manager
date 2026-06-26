import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { MisReservasPage } from '@/components/portal/mis-reservas';

type PageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function MisReservasTenantPage({ params }: PageProps) {
  const { tenant_id: tenantId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return <MisReservasPage tenantId={tenantId} atletaId={user.id} />;
}
