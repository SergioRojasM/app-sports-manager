'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import { getPerfil } from '@/services/supabase/portal/perfil.service';
import { FORMULARIO_PERFIL_CAMPOS, type FormularioSeccion } from '@/types/portal/formularios.types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type UseFormularioRespuestaFormOptions = {
  formularioPlantillaId: string | null;
  tenantId: string;
  /** The booking athlete's own id — image uploads always land under their folder. */
  atletaId: string | null;
};

/** One requested profile field with a value present, for the read-only summary strip. */
export type PerfilResumenItem = { key: string; label: string; value: string };

/** One requested profile field missing from the target athlete's profile. */
export type PerfilFaltanteItem = { key: string; label: string };

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
  /** Requested profile fields (US-0095) that already have a value — read-only summary. */
  perfilResumen: PerfilResumenItem[];
  /** Requested profile fields (US-0095) missing from the target athlete's profile. */
  perfilFaltantes: PerfilFaltanteItem[];
  perfilLoading: boolean;
  refetchPerfil: () => Promise<void>;
  updateValue: (campoNombre: string, value: string) => void;
  uploadImage: (campoNombre: string, file: File) => Promise<void>;
  validate: () => boolean;
  buildRespuesta: () => Record<string, string>;
  reset: () => void;
};

// ─────────────────────────────────────────────
// Profile completeness helpers (US-0095)
// ─────────────────────────────────────────────

function formatPerfilValue(key: string, usuario: PerfilUsuarioLike, deportivo: PerfilDeportivoLike | null): string | null {
  switch (key) {
    case 'nombre':
      return usuario.nombre?.trim() || null;
    case 'apellido':
      return usuario.apellido?.trim() || null;
    case 'telefono':
      return usuario.telefono?.trim() || null;
    case 'fecha_nacimiento':
      return usuario.fecha_nacimiento || null;
    case 'tipo_identificacion': {
      const tipo = usuario.tipo_identificacion;
      const numero = usuario.numero_identificacion?.trim();
      if (!tipo || !numero) return null;
      return `${tipo} ${numero}`;
    }
    case 'fecha_exp_identificacion':
      return usuario.fecha_exp_identificacion || null;
    case 'rh':
      return usuario.rh?.trim() || null;
    case 'peso_kg':
      return deportivo?.peso_kg != null ? `${deportivo.peso_kg} kg` : null;
    case 'altura_cm':
      return deportivo?.altura_cm != null ? `${deportivo.altura_cm} cm` : null;
    default:
      return null;
  }
}

type PerfilUsuarioLike = {
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  tipo_identificacion: string | null;
  numero_identificacion: string | null;
  fecha_exp_identificacion: string | null;
  rh: string | null;
};

type PerfilDeportivoLike = {
  peso_kg: number | null;
  altura_cm: number | null;
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

  // Profile data requirements (US-0095)
  const [perfilCamposRequeridos, setPerfilCamposRequeridos] = useState<string[]>([]);
  const [perfilResumen, setPerfilResumen] = useState<PerfilResumenItem[]>([]);
  const [perfilFaltantes, setPerfilFaltantes] = useState<PerfilFaltanteItem[]>([]);
  const [perfilLoading, setPerfilLoading] = useState(false);

  useEffect(() => {
    if (!formularioPlantillaId) {
      setSecciones([]);
      setPlantillaNombre('');
      setValues({});
      setErrors({});
      setPerfilCamposRequeridos([]);
      setPerfilResumen([]);
      setPerfilFaltantes([]);
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
        setPerfilCamposRequeridos(plantilla.perfil_campos_requeridos ?? []);
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

  const loadPerfil = useCallback(async () => {
    if (!atletaId || perfilCamposRequeridos.length === 0) {
      setPerfilResumen([]);
      setPerfilFaltantes([]);
      return;
    }

    setPerfilLoading(true);
    try {
      const { usuario, deportivo } = await getPerfil(atletaId);
      const resumen: PerfilResumenItem[] = [];
      const faltantes: PerfilFaltanteItem[] = [];

      for (const key of perfilCamposRequeridos) {
        const campo = FORMULARIO_PERFIL_CAMPOS.find((c) => c.key === key);
        const label = campo?.label ?? key;
        const value = formatPerfilValue(key, usuario, deportivo);
        if (value) {
          resumen.push({ key, label, value });
        } else {
          faltantes.push({ key, label });
        }
      }

      setPerfilResumen(resumen);
      setPerfilFaltantes(faltantes);
    } catch {
      // Couldn't verify completeness — fail closed so submission stays blocked
      // rather than silently allowing a booking with an unverified profile.
      setPerfilResumen([]);
      setPerfilFaltantes(
        perfilCamposRequeridos.map((key) => ({
          key,
          label: FORMULARIO_PERFIL_CAMPOS.find((c) => c.key === key)?.label ?? key,
        })),
      );
    } finally {
      setPerfilLoading(false);
    }
  }, [atletaId, perfilCamposRequeridos]);

  useEffect(() => {
    void loadPerfil();
  }, [loadPerfil]);

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
    if (perfilFaltantes.length > 0) return false;

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
  }, [secciones, values, perfilFaltantes]);

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
    perfilResumen,
    perfilFaltantes,
    perfilLoading,
    refetchPerfil: loadPerfil,
    updateValue,
    uploadImage,
    validate,
    buildRespuesta,
    reset,
  };
}
