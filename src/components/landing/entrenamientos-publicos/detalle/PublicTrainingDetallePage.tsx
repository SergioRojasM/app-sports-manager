'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePublicTrainingDetalle } from '@/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle';
import { RegistrateParaReservarModal } from '../RegistrateParaReservarModal';
import { PublicTrainingReservaModal } from '@/components/portal/entrenamientos-publicos/PublicTrainingReservaModal';
import { PublicTrainingDetalleBreadcrumb } from './PublicTrainingDetalleBreadcrumb';
import { PublicTrainingDetalleStates } from './PublicTrainingDetalleStates';
import { PublicTrainingDetalleBody } from './PublicTrainingDetalleBody';

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
      {/* Top padding clears the fixed landing Header, which is kept as is (US-0116) */}
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pt-28 pb-12 sm:px-6 sm:pt-32 lg:px-12 lg:pt-36">
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
        <PublicTrainingDetalleBreadcrumb origin={origin} />
        <PublicTrainingDetalleStates state="loading" />
      </Shell>
    );
  }

  // Distinct from "not found" below: a fetch failure is retryable and must not
  // be presented as a training that doesn't exist (US-0109)
  if (error) {
    return (
      <Shell>
        <PublicTrainingDetalleBreadcrumb origin={origin} />
        <PublicTrainingDetalleStates state="error" error={error} onRetry={() => void refetch()} />
      </Shell>
    );
  }

  if (!item) {
    return (
      <Shell>
        <PublicTrainingDetalleBreadcrumb origin={origin} />
        <PublicTrainingDetalleStates state="not-found" listadoHref={DEFAULT_ORIGIN} />
      </Shell>
    );
  }

  return (
    <>
      <Shell>
        <PublicTrainingDetalleBreadcrumb origin={origin} nombre={item.nombre} />
        <PublicTrainingDetalleBody item={item} onReservar={handleReservar} reservarDisabled={initializing} />
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
