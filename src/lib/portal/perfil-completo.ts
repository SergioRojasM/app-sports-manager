import type { FormularioPerfilCampo } from '@/types/portal/formularios.types';

/**
 * Single definition of the "complete profile" a tenant can require through
 * `tenants.requiere_perfil_completo` (US-0047 / US-0136). Client-safe: no Supabase import.
 */
export const PERFIL_COMPLETO_SELECT =
  'nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh';

export type PerfilCompletoRow = {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  fecha_exp_identificacion: string | null;
  rh: string | null;
};

function isBlank(value: string | null | undefined): boolean {
  return !value || !value.trim();
}

/**
 * Missing required fields, in FORMULARIO_PERFIL_CAMPOS order. `tipo_identificacion` stands for
 * both the type and the number inputs, so it is reported when either one is empty.
 */
export function getPerfilCamposFaltantes(row: PerfilCompletoRow | null | undefined): FormularioPerfilCampo[] {
  const faltantes: FormularioPerfilCampo[] = [];

  if (isBlank(row?.nombre)) faltantes.push('nombre');
  if (isBlank(row?.apellido)) faltantes.push('apellido');
  if (isBlank(row?.telefono)) faltantes.push('telefono');
  if (isBlank(row?.fecha_nacimiento)) faltantes.push('fecha_nacimiento');
  if (isBlank(row?.tipo_identificacion) || isBlank(row?.numero_identificacion)) faltantes.push('tipo_identificacion');
  if (isBlank(row?.fecha_exp_identificacion)) faltantes.push('fecha_exp_identificacion');
  if (isBlank(row?.rh)) faltantes.push('rh');

  return faltantes;
}

export function isPerfilCompleto(row: PerfilCompletoRow | null | undefined): boolean {
  return getPerfilCamposFaltantes(row).length === 0;
}
