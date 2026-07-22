import type { TrainingFormularioTipo, TrainingVisibility } from './entrenamientos.types';
import type { EntrenamientoRestriccionInput } from './entrenamiento-restricciones.types';

// ─────────────────────────────────────────────
// Training template persistence
// ─────────────────────────────────────────────

export type EntrenamientoPlantilla = {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  contenido: EntrenamientoPlantillaContenido;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EntrenamientoPlantillaCategoriaItem = {
  nivel_id: string;
  cupos_asignados: number;
};

export type EntrenamientoPlantillaContenido = {
  version: 1;
  nombre: string;
  descripcion: string;
  punto_encuentro: string;
  formulario_externo: string;
  formulario_tipo?: TrainingFormularioTipo;
  formulario_obligatorio?: boolean;
  disciplina_id: string;
  escenario_id: string;
  entrenador_id: string;
  duracion_minutos: string;
  cupo_maximo: string;
  visibilidad: TrainingVisibility;
  categorias: {
    enabled: boolean;
    items: EntrenamientoPlantillaCategoriaItem[];
  };
  restricciones: {
    reserva_antelacion_horas: number | null;
    cancelacion_antelacion_horas: number | null;
    items: EntrenamientoRestriccionInput[];
  };
};

export type CreateEntrenamientoPlantillaInput = {
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  contenido: EntrenamientoPlantillaContenido;
};

export type EntrenamientoPlantillaServiceErrorCode = 'duplicate_name' | 'forbidden' | 'unknown';

export class EntrenamientoPlantillaServiceError extends Error {
  code: EntrenamientoPlantillaServiceErrorCode;

  constructor(code: EntrenamientoPlantillaServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EntrenamientoPlantillaServiceError';
  }
}
