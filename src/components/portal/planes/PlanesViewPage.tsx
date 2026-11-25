'use client';

import type { UserRole } from '@/types/portal.types';
import { GritAlert, GritButton, GritEmptyState, GritPageHeader } from '@/components/ui';
import { usePlanesView, getActiveTipos } from '@/hooks/portal/planes/usePlanesView';
import { useSuscripcion } from '@/hooks/portal/planes/useSuscripcion';
import { PlanCard } from './PlanCard';
import { SuscripcionModal } from './SuscripcionModal';

type PlanesViewPageProps = {
  tenantId: string;
  role: UserRole;
};

/** Read-only plans catalogue for athletes and trainers (`J7Lw7d` cards); "Adquirir" for athletes. */
export function PlanesViewPage({ tenantId, role }: PlanesViewPageProps) {
  const { loading, error, planes, refresh } = usePlanesView({ tenantId });
  const suscripcion = useSuscripcion({ tenantId });

  const isUsuario = role === 'usuario';

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Planes de"
        titleAccent="membresía."
        italic
        subtitle="Consulta los planes disponibles en esta organización."
      />

      {suscripcion.successMessage ? <GritAlert tone="success">{suscripcion.successMessage}</GritAlert> : null}

      {loading ? (
        <div role="status">
          <GritEmptyState icon="hourglass_empty" title="Cargando planes…" />
        </div>
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar los planes"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : planes.length === 0 ? (
        <GritEmptyState icon="card_membership" title="No hay planes disponibles en este momento." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {planes.map((plan) => {
            const planTipos = plan.plan_tipos ?? [];
            // Defined subtypes but none active → the plan cannot be acquired
            const canAcquire = isUsuario && !(planTipos.length > 0 && getActiveTipos(plan).length === 0);
            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                disciplinaNames={plan.disciplinaNames}
                mode="readonly"
                action={
                  canAcquire ? (
                    <GritButton fullWidth icon="shopping_cart" onClick={() => void suscripcion.openModal(plan)}>
                      Adquirir
                    </GritButton>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

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
