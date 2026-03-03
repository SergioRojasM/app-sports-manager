-- =============================================
-- Migration: Composite index for reservas queries
-- US-0016: Training Booking Feature
-- =============================================

begin;

create index if not exists idx_reservas_tenant_entrenamiento
  on public.reservas (tenant_id, entrenamiento_id);

commit;
