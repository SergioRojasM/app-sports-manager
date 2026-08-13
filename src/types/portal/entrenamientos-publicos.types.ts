export type EntrenamientoPublico = {
  id: string;
  tenant_id: string;
  entrenamiento_id: string;
  nombre: string | null;
  descripcion: string | null;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string | null;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  estado: string;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  precio: number | null;
  banner_url: string | null;
  activo: boolean;
  publicado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicarEntrenamientoInput = {
  tenantId: string;
  entrenamientoId: string;
  nombre: string;
  descripcion: string | null;
  precio: number | null;
  banner_url: string | null;
};

export type EntrenamientoPublicoFormValues = {
  nombre: string;
  descripcion: string;
  precio: string;
};

export type PublicTrainingListItem = {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tenantLogoUrl: string | null;
  entrenamientoId: string;
  nombre: string;
  descripcion: string | null;
  disciplinaId: string;
  disciplinaNombre: string;
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  puntoEncuentro: string | null;
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  precio: number | null;
  bannerUrl: string | null;
  reservasActivas: number;
  /** Distinct names of services the training requires, alphabetical. Empty when unrestricted (US-0094). */
  serviciosRequeridos: string[];
  createdAt: string;
  /** Source entrenamientos.formulario_id, batched in listPublicTrainings() (US-0101). Null on the anonymous landing page. */
  formularioId: string | null;
  /** Source entrenamientos.formulario_externo, batched in listPublicTrainings() (US-0101). Null on the anonymous landing page. */
  formularioExterno: string | null;
};

export type PublicTrainingDateChip = 'today' | 'tomorrow' | 'this_week' | 'weekend';

export type PublicTrainingFilters = {
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  tenantId: string | null;
};

export type EntrenamientoPublicoServiceErrorCode =
  | 'membership_restriction'
  | 'duplicate'
  | 'fk_dependency'
  | 'forbidden'
  | 'validation'
  | 'unknown';

export class EntrenamientoPublicoServiceError extends Error {
  code: EntrenamientoPublicoServiceErrorCode;

  constructor(code: EntrenamientoPublicoServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EntrenamientoPublicoServiceError';
  }
}
