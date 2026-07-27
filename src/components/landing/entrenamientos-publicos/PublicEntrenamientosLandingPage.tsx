'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePublicEntrenamientosLanding } from '@/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding';
import { PublicTrainingsGrid } from '@/components/portal/entrenamientos-publicos/PublicTrainingsGrid';
import { RegistrateParaReservarModal } from './RegistrateParaReservarModal';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';

export function PublicEntrenamientosLandingPage() {
  const { items, loading, error } = usePublicEntrenamientosLanding();
  const [reservaTarget, setReservaTarget] = useState<PublicTrainingListItem | null>(null);

  const featuredItem = items[0] ?? null;
  const standardItems = items.slice(1);

  return (
    <div className="landing-shell min-h-screen selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-10 md:px-8 lg:px-10">
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
          <h1 className="font-landing-display text-3xl font-bold italic text-landing-text sm:text-4xl">
            Entrenamientos disponibles
          </h1>
          <p className="mt-2 font-landing-body text-sm text-landing-text-secondary sm:text-base">
            Descubre entrenamientos públicos de organizaciones en GRIT Arena. Regístrate para reservar tu cupo.
          </p>
        </div>

        {loading && (
          <p className="font-landing-body text-sm text-landing-text-secondary">Cargando entrenamientos…</p>
        )}

        {!loading && error && (
          <p className="font-landing-body text-sm text-rose-400">{error}</p>
        )}

        {!loading && !error && (
          <PublicTrainingsGrid
            featuredItem={featuredItem}
            standardItems={standardItems}
            onReservar={(item) => setReservaTarget(item)}
          />
        )}
      </div>

      <RegistrateParaReservarModal
        open={reservaTarget != null}
        trainingNombre={reservaTarget?.nombre ?? ''}
        onClose={() => setReservaTarget(null)}
      />
    </div>
  );
}
