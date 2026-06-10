// =============================================
// Servicio entity types
// =============================================

export type Servicio = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateServicioInput = {
  tenant_id: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type UpdateServicioInput = {
  nombre?: string;
  descripcion?: string | null;
  activo?: boolean;
};

export type ServicioFormValues = {
  nombre: string;
  descripcion: string;
  activo: boolean;
};

export type ServicioServiceErrorCode = 'duplicate_nombre' | 'referenced_by_plan_tipos' | 'forbidden' | 'unknown';

export class ServicioServiceError extends Error {
  constructor(
    public readonly code: ServicioServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ServicioServiceError';
  }
}

// =============================================
// PlanTipoServicio join types
// =============================================

export type PlanTipoServicio = {
  id: string;
  plan_tipo_id: string;
  servicio_id: string;
  unidades: number;
  created_at: string;
  updated_at: string;
  // Joined field
  servicio_nombre: string;
};

/** Lightweight row used in form state and sync operations */
export type PlanTipoServicioRow = {
  servicioId: string;
  unidades: number;
};

export type SyncPlanTipoServiciosInput = {
  planTipoId: string;
  rows: PlanTipoServicioRow[];
};
