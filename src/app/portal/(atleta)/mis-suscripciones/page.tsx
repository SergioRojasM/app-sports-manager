import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import { fetchMisSuscripciones } from '@/services/supabase/portal/mis-suscripciones.service';
import { MisSuscripcionesYPagosPage } from '@/components/portal/mis-suscripciones';

export default async function MisSuscripcionesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent('/portal/mis-suscripciones')}`);
  }

  const suscripciones = await fetchMisSuscripciones(supabase, user.id);

  return <MisSuscripcionesYPagosPage suscripciones={suscripciones} userId={user.id} />;
}
