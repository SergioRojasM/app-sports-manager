'use client';

import Link from 'next/link';
import Header from '@/components/landing/Header';
import { useEventosLanding } from '@/hooks/landing/eventos/useEventosLanding';
import { useObtenerEntrada } from '@/hooks/portal/eventos/useObtenerEntrada';
import { buildEventoLandingDetalleHref } from '@/lib/portal/eventos-publicos.utils';
import { EventosPublicosGrid } from '@/components/portal/eventos/EventosPublicosGrid';
import { ObtenerEntradaModal } from '@/components/portal/eventos/ObtenerEntradaModal';

const LISTADO_PATH = '/eventos';

/** Anonymous event discovery page (US-0120), modeled on the public-trainings landing page. */
export function EventosLandingPage() {
  const { items, loading, error, refetch } = useEventosLanding();
  const obtenerEntrada = useObtenerEntrada({ surface: 'landing-listado' });

  const featuredItem = items[0] ?? null;
  const standardItems = items.slice(1);

  return (
    <div className="landing-shell min-h-screen selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-28 pb-10 sm:pt-32 md:px-8 lg:px-10 lg:pt-36">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 font-landing-body text-sm font-semibold text-landing-text-secondary transition hover:text-landing-primary"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          Volver al inicio
        </Link>

        <div>
          <h1 className="font-landing-display text-3xl font-bold italic text-landing-text sm:text-4xl">Eventos disponibles</h1>
          <p className="mt-2 font-landing-body text-sm text-landing-text-secondary sm:text-base">
            Descubre los eventos de los equipos en GRIT Arena y obtén tu entrada.
          </p>
        </div>

        {loading && <p className="font-landing-body text-sm text-landing-text-secondary">Cargando eventos…</p>}

        {!loading && error && (
          <div className="flex flex-col items-start gap-3">
            <p className="font-landing-body text-sm text-rose-400">{error}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg border border-landing-border px-3 py-2 font-landing-body text-xs font-semibold text-landing-text transition hover:border-landing-primary/50"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && (
          <EventosPublicosGrid
            featuredItem={featuredItem}
            standardItems={standardItems}
            buildDetalleHref={(evento) => buildEventoLandingDetalleHref(evento.id, { from: LISTADO_PATH })}
            onObtenerEntrada={obtenerEntrada.obtenerEntrada}
            obtenerEntradaDisabled={obtenerEntrada.disabled}
          />
        )}
      </div>

      <ObtenerEntradaModal
        open={obtenerEntrada.registroModalOpen}
        eventoNombre={obtenerEntrada.target?.nombre ?? ''}
        signupHref={obtenerEntrada.signupHref}
        loginHref={obtenerEntrada.loginHref}
        onContinuarSinRegistro={obtenerEntrada.continuarSinRegistro}
        onClose={obtenerEntrada.closeRegistroModal}
      />
    </div>
  );
}
