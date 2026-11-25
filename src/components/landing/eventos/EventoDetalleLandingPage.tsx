'use client';

import { useSearchParams } from 'next/navigation';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useEventoDetalle } from '@/hooks/portal/eventos/useEventoDetalle';
import { useObtenerEntrada } from '@/hooks/portal/eventos/useObtenerEntrada';
import { resolveEventosOrigin } from '@/lib/portal/eventos-publicos.utils';
import { EventoDetalleBody } from '@/components/portal/eventos/detalle/EventoDetalleBody';
import { EventoDetalleStates } from '@/components/portal/eventos/detalle/EventoDetalleStates';
import { EventoEntradasModal } from '@/components/portal/eventos/EventoEntradasModal';
import { ObtenerEntradaModal } from '@/components/portal/eventos/ObtenerEntradaModal';
import { EventoDetalleBreadcrumb } from './EventoDetalleBreadcrumb';

const LISTADO_PATH = '/eventos';

type EventoDetalleLandingPageProps = {
  eventoId: string;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-shell min-h-screen selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      {/* Top padding clears the fixed landing Header */}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:px-12 lg:pt-36">
        {children}
      </div>
      <Footer />
    </div>
  );
}

/** Public event page (US-0120). Only `publico` events resolve here, even for a logged-in member. */
export function EventoDetalleLandingPage({ eventoId }: EventoDetalleLandingPageProps) {
  const { evento, loading, error, refetch } = useEventoDetalle(eventoId, { soloPublicos: true });
  const obtenerEntrada = useObtenerEntrada({ surface: 'landing-detalle', autoOpen: { evento, ready: !loading } });
  const searchParams = useSearchParams();
  const origin = resolveEventosOrigin(searchParams.get('from'), LISTADO_PATH);

  if (loading) {
    return (
      <Shell>
        <EventoDetalleBreadcrumb origin={origin} />
        <EventoDetalleStates state="loading" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <EventoDetalleBreadcrumb origin={origin} />
        <EventoDetalleStates state="error" error={error} onRetry={() => void refetch()} />
      </Shell>
    );
  }

  if (!evento) {
    return (
      <Shell>
        <EventoDetalleBreadcrumb origin={origin} />
        <EventoDetalleStates state="not-found" listadoHref={LISTADO_PATH} />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <EventoDetalleBreadcrumb origin={origin} nombre={evento.nombre} />
        <EventoDetalleBody
          evento={evento}
          tipoLabel="Evento público"
          onObtenerEntrada={() => obtenerEntrada.obtenerEntrada(evento)}
          obtenerEntradaDisabled={obtenerEntrada.disabled}
        />
      </Shell>

      <ObtenerEntradaModal
        open={obtenerEntrada.registroModalOpen}
        eventoNombre={evento.nombre}
        signupHref={obtenerEntrada.signupHref}
        loginHref={obtenerEntrada.loginHref}
        onContinuarSinRegistro={obtenerEntrada.continuarSinRegistro}
        onClose={obtenerEntrada.closeRegistroModal}
      />

      <EventoEntradasModal
        open={obtenerEntrada.entradasModal.open}
        evento={obtenerEntrada.target}
        modo={obtenerEntrada.entradasModal.modo}
        onClose={obtenerEntrada.entradasModal.close}
      />
    </>
  );
}
