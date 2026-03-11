import { redirect } from 'next/navigation';
import { createClient } from '@/services/supabase/server';
import {
  fetchInicioStats,
  fetchProximosEntrenamientos,
  fetchMisSuscripciones,
  fetchPagosPendientes,
  fetchMisMembresias,
} from '@/services/supabase/portal/inicio.service';
import { InicioPage } from '@/components/portal/inicio';

export default async function InicioRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const [stats, proximosEntrenamientos, suscripciones, pagosPendientes, membresias] =
    await Promise.all([
      fetchInicioStats(supabase, user.id),
      fetchProximosEntrenamientos(supabase, user.id, 5),
      fetchMisSuscripciones(supabase, user.id),
      fetchPagosPendientes(supabase, user.id),
      fetchMisMembresias(supabase, user.id),
    ]);

  return (
    <InicioPage
      data={{
        stats,
        proximosEntrenamientos,
        suscripciones,
        pagosPendientes,
        membresias,
      }}
    />
  );
}
