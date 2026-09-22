'use client';

import type { UserRole } from '@/types/portal.types';
import { usePlanesView, getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import { useSuscripcion } from '@/hooks/portal/planes/useSuscripcion';
import { PlanesTable } from './PlanesTable';
import { SuscripcionModal } from './SuscripcionModal';
import { GritPageHeader } from '@/components/ui';

type PlanesViewPageProps = {
  tenantId: string;
  role: UserRole;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando planes...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
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
      <GritPageHeader title="Planes de Membresía" subtitle="Consulta los planes disponibles en esta organización." />

      {suscripcion.successMessage ? (
        <div
          className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200"
          role="status"
        >
          {suscripcion.successMessage}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
          <p className="text-sm text-grit-danger">{error}</p>
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
                      className="rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg transition hover:bg-grit-cyan/90"
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
