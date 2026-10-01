import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { MisEntradasPage } from '@/components/portal/mis-entradas';

export default async function MisEntradasCrossTenantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/mis-entradas')}`);
  }

  return <MisEntradasPage />;
}
