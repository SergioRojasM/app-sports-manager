import { createClient } from '@/services/supabase/client';
import {
  EntrenamientoPlantillaServiceError,
  type EntrenamientoPlantilla,
  type CreateEntrenamientoPlantillaInput,
} from '@/types/portal/entrenamiento-plantillas.types';

type PostgrestError = { code?: string; message?: string };

function mapEntrenamientoPlantillaError(error: PostgrestError | null): EntrenamientoPlantillaServiceError {
  if (error?.code === '23505') {
    return new EntrenamientoPlantillaServiceError('duplicate_name', 'Ya existe una plantilla con ese nombre.');
  }
  if (error?.code === '42501') {
    return new EntrenamientoPlantillaServiceError('forbidden', 'No tienes permisos para crear plantillas en esta organización.');
  }
  return new EntrenamientoPlantillaServiceError('unknown', 'No fue posible completar la operación.');
}

export const entrenamientoPlantillasService = {
  async list(tenantId: string): Promise<EntrenamientoPlantilla[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('entrenamiento_plantillas')
      .select('id, tenant_id, nombre, descripcion, contenido, created_by, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .order('updated_at', { ascending: false });

    if (error) throw mapEntrenamientoPlantillaError(error);
    return (data ?? []) as EntrenamientoPlantilla[];
  },

  async create(input: CreateEntrenamientoPlantillaInput): Promise<EntrenamientoPlantilla> {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('entrenamiento_plantillas')
      .insert({
        tenant_id: input.tenantId,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        contenido: input.contenido,
        created_by: user?.id ?? null,
      })
      .select('id, tenant_id, nombre, descripcion, contenido, created_by, created_at, updated_at')
      .single();

    if (error || !data) throw mapEntrenamientoPlantillaError(error);
    return data as EntrenamientoPlantilla;
  },

  async delete(tenantId: string, id: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('entrenamiento_plantillas')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw mapEntrenamientoPlantillaError(error);
  },
};
