'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import type { FormularioSeccion } from '@/types/portal/formularios.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UseFormularioRespuestaFormOptions = {
  formularioPlantillaId: string | null;
  tenantId: string;
  /** The booking athlete's own id — image uploads always land under their folder. */
  atletaId: string | null;
};

type UseFormularioRespuestaFormResult = {
  loading: boolean;
  loadError: string | null;
  plantillaNombre: string;
  secciones: FormularioSeccion[];
  values: Record<string, string>;
  errors: Record<string, string>;
  /** campo_nombre currently uploading a file, or null when none is in progress. */
  uploadingCampoNombre: string | null;
  uploadError: string | null;
  updateValue: (campoNombre: string, value: string) => void;
  uploadImage: (campoNombre: string, file: File) => Promise<void>;
  validate: () => boolean;
  buildRespuesta: () => Record<string, string>;
  reset: () => void;
};

// ─────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────

export function useFormularioRespuestaForm({
  formularioPlantillaId,
  tenantId,
  atletaId,
}: UseFormularioRespuestaFormOptions): UseFormularioRespuestaFormResult {
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [plantillaNombre, setPlantillaNombre] = useState('');
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingCampoNombre, setUploadingCampoNombre] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!formularioPlantillaId) {
      setSecciones([]);
      setPlantillaNombre('');
      setValues({});
      setErrors({});
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    formulariosService
      .getPlantillaConSecciones(formularioPlantillaId)
      .then((plantilla) => {
        if (cancelled) return;
        setPlantillaNombre(plantilla.nombre);
        setSecciones(plantilla.secciones.filter((s) => s.activo));
        setValues({});
        setErrors({});
      })
      .catch(() => {
        if (!cancelled) setLoadError('No fue posible cargar el formulario.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formularioPlantillaId]);

  const updateValue = useCallback((campoNombre: string, value: string) => {
    setValues((prev) => ({ ...prev, [campoNombre]: value }));
    setErrors((prev) => ({ ...prev, [campoNombre]: '' }));
  }, []);

  const uploadImage = useCallback(
    async (campoNombre: string, file: File) => {
      if (!formularioPlantillaId || !atletaId) return;

      setUploadingCampoNombre(campoNombre);
      setUploadError(null);

      try {
        const supabase = createClient();
        const result = await storageService.uploadFormularioRespuestaImage(
          supabase,
          tenantId,
          atletaId,
          formularioPlantillaId,
          campoNombre,
          file,
        );
        updateValue(campoNombre, result.path);
      } catch {
        setUploadError('No fue posible subir el archivo. Intenta de nuevo.');
      } finally {
        setUploadingCampoNombre(null);
      }
    },
    [formularioPlantillaId, tenantId, atletaId, updateValue],
  );

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const seccion of secciones) {
      if (seccion.seccion_tipo !== 'datos' || !seccion.campo_obligatorio || !seccion.campo_nombre) {
        continue;
      }
      const value = values[seccion.campo_nombre];
      if (!value || !value.trim()) {
        newErrors[seccion.campo_nombre] = 'Este campo es obligatorio.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [secciones, values]);

  const buildRespuesta = useCallback((): Record<string, string> => {
    const respuesta: Record<string, string> = {};
    for (const seccion of secciones) {
      if (seccion.seccion_tipo !== 'datos' || !seccion.campo_nombre) continue;
      const value = values[seccion.campo_nombre];
      if (value !== undefined && value.trim() !== '') {
        respuesta[seccion.campo_nombre] = value.trim();
      }
    }
    return respuesta;
  }, [secciones, values]);

  const reset = useCallback(() => {
    setValues({});
    setErrors({});
    setUploadError(null);
    setUploadingCampoNombre(null);
  }, []);

  return {
    loading,
    loadError,
    plantillaNombre,
    secciones,
    values,
    errors,
    uploadingCampoNombre,
    uploadError,
    updateValue,
    uploadImage,
    validate,
    buildRespuesta,
    reset,
  };
}
