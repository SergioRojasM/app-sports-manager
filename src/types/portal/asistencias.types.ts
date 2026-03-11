export type Asistencia = {
  id: string;
  tenant_id: string;
  reserva_id: string;
  validado_por: string | null;
  fecha_asistencia: string | null;
  asistio: boolean;
  observaciones: string | null;
  created_at: string;
};

export type AsistenciaFormValues = {
  asistio: boolean;
  observaciones: string;
};

export type UpsertAsistenciaInput = {
  tenant_id: string;
  reserva_id: string;
  validado_por: string;
  fecha_asistencia: string; // ISO string — now()
  asistio: boolean;
  observaciones: string | null;
};
