'use client';

import { useCallback, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import type { FormularioPerfilCampo, FormularioSeccion } from '@/types/portal/formularios.types';

/**
 * Read-only formulario preview ("Vista previa") over formulariosService.getPlantillaConSecciones.
 * Copied from the public-trainings slice (US-0101) so the events module does not depend on
 * that soon-to-be-deprecated feature (US-0120).
 */
export function useFormularioPreview() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plantillaNombre, setPlantillaNombre] = useState('');
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [perfilCamposRequeridos, setPerfilCamposRequeridos] = useState<FormularioPerfilCampo[]>([]);

  const openPreview = useCallback((formularioId: string) => {
    setOpen(true);
    setLoading(true);
    setError(null);

    formulariosService
      .getPlantillaConSecciones(formularioId)
      .then((plantilla) => {
        setPlantillaNombre(plantilla.nombre);
        setSecciones(plantilla.secciones);
        setPerfilCamposRequeridos(plantilla.perfil_campos_requeridos ?? []);
      })
      .catch(() => {
        setError('No fue posible cargar el formulario.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const closePreview = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    loading,
    error,
    plantillaNombre,
    secciones,
    perfilCamposRequeridos,
    openPreview,
    closePreview,
  };
}
