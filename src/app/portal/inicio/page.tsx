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
import { buildAgendaVentana } from '@/lib/portal/inicio-agenda';
import { readPortalProfileName } from '@/lib/portal/portal-profile-cookie';

export default async function InicioRoute() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // One 7-day Bogotá window shared by the KPI count and the agenda.
  const ventana = buildAgendaVentana(new Date());

  const [nombre, stats, proximosEntrenamientos, suscripciones, pagosPendientes, membresias] =
    await Promise.all([
      readPortalProfileName(),
      fetchInicioStats(supabase, user.id, ventana),
      fetchProximosEntrenamientos(supabase, user.id, ventana),
      fetchMisSuscripciones(supabase, user.id),
      fetchPagosPendientes(supabase, user.id),
      fetchMisMembresias(supabase, user.id),
    ]);

  return (
    <InicioPage
      nombre={nombre}
      ventana={ventana}
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
