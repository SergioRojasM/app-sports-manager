import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { MisReservasPage } from '@/components/portal/mis-reservas';

export default async function MisReservasCrossTenantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/mis-reservas')}`);
  }

  return <MisReservasPage atletaId={user.id} />;
}
