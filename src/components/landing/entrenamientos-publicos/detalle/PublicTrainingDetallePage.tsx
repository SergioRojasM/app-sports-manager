'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePublicTrainingDetalle } from '@/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle';
import { RegistrateParaReservarModal } from '../RegistrateParaReservarModal';
import { PublicTrainingReservaModal } from '@/components/portal/entrenamientos-publicos/PublicTrainingReservaModal';
import { PublicTrainingDetalleHero } from './PublicTrainingDetalleHero';
import { PublicTrainingDetalleDescripcion } from './PublicTrainingDetalleDescripcion';
import { PublicTrainingDetalleIncluye } from './PublicTrainingDetalleIncluye';
import { PublicTrainingDetalleCronograma } from './PublicTrainingDetalleCronograma';
import { PublicTrainingDetalleUbicacion } from './PublicTrainingDetalleUbicacion';
import { PublicTrainingDetalleReserva } from './PublicTrainingDetalleReserva';
import { PublicTrainingDetallePrecios } from './PublicTrainingDetallePrecios';

type PublicTrainingDetallePageProps = {
  entrenamientoId: string;
};

const DEFAULT_ORIGIN = '/entrenamientos-publicos';

/**
 * Resolves the "go back" target from the `from` search param (US-0109).
 *
 * `from` is the single source of truth — never `router.back()` or
 * `document.referrer` — so the crumb still works after a hard reload and for a
 * visitor arriving cold from an external link, neither of which has in-app
 * history. Only same-origin absolute paths are honoured: a value that doesn't
 * start with "/", or a protocol-relative "//evil.com", falls back to the public
 * listing rather than becoming an off-site link.
 */
function resolveOrigin(from: string | null): string {
  if (!from || !from.startsWith('/') || from.startsWith('//')) return DEFAULT_ORIGIN;
  return from;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-shell min-h-screen selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-28 pb-12 sm:pt-32 md:px-8 lg:px-10 lg:pt-36">
        {children}
      </div>
      <Footer />
    </div>
  );
}

export function PublicTrainingDetallePage({ entrenamientoId }: PublicTrainingDetallePageProps) {
  const { item, loading, error, refetch } = usePublicTrainingDetalle(entrenamientoId);
  const { user, initializing } = useAuth();
  const searchParams = useSearchParams();
  const origin = resolveOrigin(searchParams.get('from'));

  const [registrateOpen, setRegistrateOpen] = useState(false);
  const [reservaOpen, setReservaOpen] = useState(false);

  // Reuses the two EXISTING booking entry points unmodified: anonymous visitors
  // get the guided signup journey (US-0103), authenticated ones the marketplace
  // booking modal. Never opens either while the session is still resolving.
  const handleReservar = () => {
    if (initializing) return;
    if (user) setReservaOpen(true);
    else setRegistrateOpen(true);
  };

  if (loading) {
    return (
      <Shell>
        <p className="font-landing-body text-sm text-landing-text-secondary">Cargando entrenamiento…</p>
      </Shell>
    );
  }

  // Distinct from "not found" below: a fetch failure is retryable and must not
  // be presented as a training that doesn't exist (US-0109)
  if (error) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-3">
          <h1 className="font-landing-display text-2xl font-bold text-landing-text">
            No pudimos cargar este entrenamiento
          </h1>
          <p className="font-landing-body text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-landing-primary px-4 py-2 font-landing-body text-sm font-semibold text-landing-bg transition hover:bg-landing-primary-light"
          >
            Reintentar
          </button>
        </div>
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-3">
          <h1 className="font-landing-display text-2xl font-bold text-landing-text">Entrenamiento no disponible</h1>
          <p className="font-landing-body text-sm text-landing-text-secondary">
            Este entrenamiento no existe, ya no está publicado o su fecha ya pasó.
          </p>
          <Link
            href={DEFAULT_ORIGIN}
            className="rounded-lg bg-landing-primary px-4 py-2 font-landing-body text-sm font-semibold text-landing-bg transition hover:bg-landing-primary-light"
          >
            Ver entrenamientos disponibles
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <nav aria-label="Ruta de navegación">
          <ol className="flex flex-wrap items-center gap-1.5 font-landing-body text-[13px] font-medium text-landing-text-secondary">
            <li>
              <Link href="/" className="transition hover:text-landing-primary">
                Inicio
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li>
              <Link href={origin} className="transition hover:text-landing-primary">
                Entrenamientos
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="font-bold text-landing-text" aria-current="page">
              {item.nombre}
            </li>
          </ol>
        </nav>

        <Link
          href={origin}
          className="inline-flex w-fit items-center gap-1 font-landing-body text-sm font-semibold text-landing-text-secondary transition hover:text-landing-primary"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          Volver
        </Link>

        <PublicTrainingDetalleHero item={item} />

        <div className="h-px w-full bg-landing-primary/25" />

        <PublicTrainingDetalleDescripcion descripcionLarga={item.descripcionLarga} />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <PublicTrainingDetalleIncluye incluye={item.incluye} />
          <PublicTrainingDetalleCronograma cronograma={item.cronograma} duracionMinutos={item.duracionMinutos} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PublicTrainingDetalleUbicacion
            escenarioNombre={item.escenarioNombre}
            escenarioUbicacion={item.escenarioUbicacion}
            puntoEncuentro={item.puntoEncuentro}
          />
          <PublicTrainingDetalleReserva
            reservasActivas={item.reservasActivas}
            cupoMaximo={item.cupoMaximo}
            duracionMinutos={item.duracionMinutos}
            entrenadorNombre={item.entrenadorNombre}
            paginaEventoUrl={item.paginaEventoUrl}
            reservarDisabled={initializing}
            onReservar={handleReservar}
          />
        </div>

        <PublicTrainingDetallePrecios precio={item.precio} />

        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-landing-primary/25 bg-landing-surface-card/60 p-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-landing-primary/[0.13]">
              <span className="material-symbols-outlined text-xl text-landing-primary" aria-hidden="true">
                bolt
              </span>
            </span>
            <span className="flex flex-col">
              <span className="font-landing-display text-xl font-bold text-landing-text">
                ¿Listo para mejorar tu rendimiento?
              </span>
              <span className="font-landing-body text-[13px] font-medium text-landing-text-secondary">
                Asegura tu cupo y entrena con propósito.
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={handleReservar}
            disabled={initializing}
            aria-disabled={initializing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-landing-primary px-5 py-3 font-landing-body text-sm font-bold text-landing-bg transition hover:bg-landing-primary-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {initializing ? 'Cargando…' : 'Reservar mi cupo'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              arrow_forward
            </span>
          </button>
        </section>
      </Shell>

      <RegistrateParaReservarModal
        open={registrateOpen}
        target={registrateOpen ? item : null}
        onClose={() => setRegistrateOpen(false)}
      />

      {reservaOpen && (
        <PublicTrainingReservaModal
          open={reservaOpen}
          tenantId={item.tenantId}
          entrenamientoId={item.entrenamientoId}
          disciplinaId={item.disciplinaId}
          trainingNombre={item.nombre}
          tenantNombre={item.tenantNombre}
          omitirConfirmacionPlan={item.omitirConfirmacionPlan}
          onClose={() => setReservaOpen(false)}
        />
      )}
    </>
  );
}
