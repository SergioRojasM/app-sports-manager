export type EntrenamientoGrupoCategoria = {
  id: string;
  grupo_id: string;
  nivel_id: string;
  cupos_asignados: number;
  created_at: string;
};

export type EntrenamientoCategoria = {
  id: string;
  entrenamiento_id: string;
  nivel_id: string;
  cupos_asignados: number;
  sincronizado_grupo: boolean;
  created_at: string;
};

export type EntrenamientoCategoriaInput = {
  nivel_id: string;
  cupos_asignados: number;
};

export type EntrenamientoCategoriaConCapacidad = EntrenamientoCategoria & {
  nivel_nombre: string;
  nivel_orden: number;
};
