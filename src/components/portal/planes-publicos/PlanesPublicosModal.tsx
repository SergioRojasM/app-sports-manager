'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePlanesPublicos } from '@/hooks/portal/planes-publicos/usePlanesPublicos';
import { useSuscripcion } from '@/hooks/portal/planes/useSuscripcion';
import { SuscripcionModal } from '@/components/portal/planes/SuscripcionModal';
import { PlanPublicoCard } from './PlanPublicoCard';
import type { PlanPublicoItem } from '@/types/portal/planes-publicos.types';
import type { PendingPlanPurchaseDraft } from '@/types/portal/suscripciones.types';

type PlanesPublicosModalProps = {
  open: boolean;
  tenantId: string;
  tenantNombre: string;
  onClose: () => void;
  /** Pre-fills the catalog search on open — e.g. a required service's name (US-0101). Existing callers that omit this keep today's unfiltered behavior. */
  initialSearch?: string;
  /**
   * Forwarded to useSuscripcion — hands the filled-in purchase to the caller instead of
   * creating it here, so the caller can persist it as part of its own flow (US-0106/US-0110).
   * Existing callers that omit this keep today's immediate-purchase behavior.
   */
  onSubscribed?: (purchase: PendingPlanPurchaseDraft) => void;
};

export function PlanesPublicosModal({
  open,
  tenantId,
  tenantNombre,
  onClose,
  initialSearch,
  onSubscribed,
}: PlanesPublicosModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const catalog = usePlanesPublicos({ tenantId, enabled: open, initialSearch });
  const suscripcion = useSuscripcion({ tenantId, onSubscribed });

  // Membership (and with it the role) is resolved by the catalog itself, since it also
  // decides whether member-only plans are listed — no second access query here.
  // Tenant staff manage plans instead of buying them (mirrors the in-tenant rule)
  const canAcquire = catalog.role !== 'administrador' && catalog.role !== 'entrenador';

  const handleClose = useCallback(() => {
    if (suscripcion.isSubmitting) return;
    onClose();
  }, [onClose, suscripcion.isSubmitting]);

  // Escape to close + focus the dialog on open
  useEffect(() => {
    if (!open) return;

    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !suscripcion.modalOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose, suscripcion.modalOpen]);

  // The modal isn't unmounted between opens (usePlanesPublicos's `search` state
  // persists across `open` toggles), so re-apply initialSearch on every reopen —
  // otherwise a later open with a different (or no) initialSearch would keep
  // whatever term was left over from a previous open (US-0101).
  useEffect(() => {
    if (!open) return;
    catalog.setSearch(initialSearch ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSearch]);

  const handleAcquire = useCallback(
    (plan: PlanPublicoItem) => {
      void suscripcion.openModal(plan);
    },
    [suscripcion],
  );

  if (!open) return null;

  const { loading, error, plans, filteredPlans, search, setSearch, retry } = catalog;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />

        <div
          ref={dialogRef}
          tabIndex={-1}
          className="border bg-grit-glass backdrop-blur-md relative z-10 mx-4 flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-grit-lg border-grit-glass-border p-6 shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="planes-publicos-modal-title"
        >
          <div className="flex flex-shrink-0 items-start justify-between gap-4">
            <div>
              <h2 id="planes-publicos-modal-title" className="font-grit-title text-xl font-semibold text-grit-text">
                Planes de {tenantNombre}
              </h2>
              <p className="mt-1 text-sm text-grit-subtext">
                {catalog.esMiembro
                  ? 'Eres miembro de esta organización: además de los planes públicos, aquí puedes adquirir sus planes exclusivos para miembros.'
                  : 'Planes disponibles para cualquier persona, sin necesidad de pertenecer a la organización.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              aria-label="Cerrar"
              className="rounded-grit-md border border-grit-glass-border p-1.5 text-grit-subtext transition hover:text-grit-text"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          {suscripcion.successMessage ? (
            <div
              className="mt-4 flex-shrink-0 rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
              role="status"
            >
              {suscripcion.successMessage}
            </div>
          ) : null}

          <div className="mt-4 flex-shrink-0">
            <label htmlFor="planes-publicos-search" className="sr-only">
              Buscar planes o servicios
            </label>
            <input
              id="planes-publicos-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar planes o servicios"
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted focus:border-grit-cyan focus:outline-none"
            />
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            <p className="sr-only" role="status" aria-live="polite">
              {loading
                ? 'Cargando planes'
                : `${filteredPlans.length} planes disponibles`}
            </p>

            {loading ? (
              <p className="rounded-grit-2xl border border-grit-glass-border p-6 text-sm text-grit-subtext">
                Cargando planes...
              </p>
            ) : null}

            {!loading && error ? (
              <div className="rounded-grit-2xl border border-grit-danger/25 bg-grit-danger/10 p-6">
                <p className="text-sm text-grit-danger">{error}</p>
                <button
                  type="button"
                  onClick={() => void retry()}
                  className="mt-3 rounded-grit-md border border-grit-danger/30 px-3 py-1.5 text-xs font-semibold text-grit-danger"
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {!loading && !error && plans.length === 0 ? (
              <p className="rounded-grit-2xl border border-grit-glass-border p-6 text-sm text-grit-subtext">
                {catalog.esMiembro
                  ? 'Esta organización no tiene planes activos disponibles.'
                  : 'Esta organización no tiene planes públicos disponibles.'}
              </p>
            ) : null}

            {!loading && !error && plans.length > 0 && filteredPlans.length === 0 ? (
              <div className="rounded-grit-2xl border border-grit-glass-border p-6 text-center">
                <p className="text-sm text-grit-subtext">
                  No se encontraron planes ni servicios que coincidan con la búsqueda.
                </p>
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="mt-3 text-sm font-medium text-grit-cyan hover:underline"
                >
                  Limpiar búsqueda
                </button>
              </div>
            ) : null}

            {!loading && !error && filteredPlans.length > 0 ? (
              <div className="space-y-3">
                {filteredPlans.map((plan) => (
                  <PlanPublicoCard
                    key={plan.id}
                    plan={plan}
                    canAcquire={canAcquire}
                    onAcquire={handleAcquire}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <SuscripcionModal
        open={suscripcion.modalOpen}
        plan={suscripcion.selectedPlan}
        isSubmitting={suscripcion.isSubmitting}
        error={suscripcion.error}
        isDuplicate={suscripcion.isDuplicate}
        checkingDuplicate={suscripcion.checkingDuplicate}
        metodosPago={suscripcion.metodosPago}
        metodosPagoError={suscripcion.metodosPagoError}
        selectedTipoId={suscripcion.selectedTipoId}
        onSelectTipo={suscripcion.selectTipo}
        onConfirm={(data) => void suscripcion.submit(data)}
        onClose={suscripcion.closeModal}
      />
    </>
  );
}
