'use client';

import type { UserRole } from '@/types/portal.types';
import { usePlanesView, getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import { useSuscripcion } from '@/hooks/portal/planes/useSuscripcion';
import { PlanesTable } from './PlanesTable';
import { SuscripcionModal } from './SuscripcionModal';

type PlanesViewPageProps = {
  tenantId: string;
  role: UserRole;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando planes...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      No hay planes disponibles en este momento.
    </div>
  );
}

export function PlanesViewPage({ tenantId, role }: PlanesViewPageProps) {
  const { loading, error, planes } = usePlanesView({ tenantId });
  const suscripcion = useSuscripcion({ tenantId });

  const isUsuario = role === 'usuario';

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Planes de Membresía</h1>
        <p className="mt-2 text-sm text-slate-400">
          Consulta los planes disponibles en esta organización.
        </p>
      </header>

      {suscripcion.successMessage ? (
        <div
          className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {suscripcion.successMessage}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      ) : null}

      {!loading && !error && planes.length === 0 ? <EmptyState /> : null}

      {!loading && !error && planes.length > 0 ? (
        <PlanesTable
          rows={planes}
          readOnly={!isUsuario}
          renderRowAction={
            isUsuario
              ? (plan) => {
                  const planTipos = plan.plan_tipos ?? [];
                  const hasDefinedSubtypes = planTipos.length > 0;
                  const hasActiveSubtypes = getActiveTipos(plan).length > 0;

                  // If subtypes are defined but none are active, hide the button
                  if (hasDefinedSubtypes && !hasActiveSubtypes) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => void suscripcion.openModal(plan)}
                      className="rounded-lg bg-turquoise px-3 py-1.5 text-xs font-semibold text-navy-deep transition hover:bg-turquoise/90"
                    >
                      Adquirir
                    </button>
                  );
                }
              : undefined
          }
        />
      ) : null}

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
    </section>
  );
}
