'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import {
  EntrenamientoPublicoServiceError,
  type CronogramaItem,
  type EntrenamientoPublicoFormValues,
  type IncluyeItem,
  type PrecioFormRow,
  type PrecioItem,
} from '@/types/portal/entrenamientos-publicos.types';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

const EMPTY_VALUES: EntrenamientoPublicoFormValues = {
  nombre: '',
  descripcion: '',
  precio: [],
  descripcionLarga: '',
  paginaEventoUrl: '',
  cronograma: [],
  incluye: [],
  omitirConfirmacionPlan: false,
};

/** The three repeatable lists, each editable as add/remove/update rows (US-0109). */
export type RowListField = 'precio' | 'cronograma' | 'incluye';

/**
 * Every field name across the three row shapes. A single union (rather than a
 * per-list generic) keeps `updateRow` assignable to a plain component prop while
 * still rejecting a misspelled key at compile time.
 */
export type RowFieldKey = 'nombre' | 'precio' | 'descripcion' | 'hora' | 'titulo';

const EMPTY_ROW: { precio: PrecioFormRow; cronograma: CronogramaItem; incluye: IncluyeItem } = {
  precio: { nombre: '', precio: '', descripcion: '' },
  cronograma: { hora: '', descripcion: '' },
  incluye: { titulo: '', descripcion: '' },
};

/**
 * Per-row validation errors, keyed by row index. Only the offending row is
 * flagged so one bad amount never blocks editing the rest (US-0109).
 */
export type PublicarRowErrors = Record<number, string>;

function isWellFormedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

type UsePublicarEntrenamientoOptions = {
  tenantId: string;
};

export function usePublicarEntrenamiento({ tenantId }: UsePublicarEntrenamientoOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [training, setTraining] = useState<TrainingInstance | null>(null);
  const [publicacionId, setPublicacionId] = useState<string | null>(null);
  const [values, setValues] = useState<EntrenamientoPublicoFormValues>(EMPTY_VALUES);
  const [existingBannerUrl, setExistingBannerUrl] = useState<string | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [precioErrors, setPrecioErrors] = useState<PublicarRowErrors>({});
  const [paginaEventoUrlError, setPaginaEventoUrlError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  const reset = useCallback(() => {
    setTraining(null);
    setPublicacionId(null);
    setValues(EMPTY_VALUES);
    setExistingBannerUrl(null);
    setBannerFile(null);
    setBannerPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setBannerError(null);
    setSubmitError(null);
    setPrecioErrors({});
    setPaginaEventoUrlError(null);
  }, []);

  const open = useCallback(
    async (target: TrainingInstance) => {
      reset();
      setTraining(target);
      setIsOpen(true);
      setIsLoading(true);

      try {
        const publicacion = await entrenamientosPublicosService.getPublicacionByEntrenamientoId(tenantId, target.id);

        if (publicacion) {
          setPublicacionId(publicacion.id);
          setValues({
            nombre: publicacion.nombre ?? target.nombre,
            descripcion: publicacion.descripcion ?? '',
            precio: (publicacion.precio ?? []).map((item) => ({
              nombre: item.nombre ?? '',
              precio: item.precio != null ? String(item.precio) : '',
              descripcion: item.descripcion ?? '',
            })),
            descripcionLarga: publicacion.descripcion_larga ?? '',
            paginaEventoUrl: publicacion.pagina_evento_url ?? '',
            cronograma: publicacion.cronograma ?? [],
            incluye: publicacion.incluye ?? [],
            omitirConfirmacionPlan: publicacion.omitir_confirmacion_plan,
          });
          setExistingBannerUrl(publicacion.banner_url);
        } else {
          setValues({
            ...EMPTY_VALUES,
            nombre: target.nombre,
            descripcion: target.descripcion ?? '',
          });
        }
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'No fue posible cargar la publicación.');
      } finally {
        setIsLoading(false);
      }
    },
    [reset, tenantId],
  );

  const close = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
    reset();
  }, [isSubmitting, reset]);

  const updateField = useCallback(
    (field: 'nombre' | 'descripcion' | 'descripcionLarga' | 'paginaEventoUrl', value: string) => {
      setValues((prev) => ({ ...prev, [field]: value }));
      if (field === 'paginaEventoUrl') setPaginaEventoUrlError(null);
    },
    [],
  );

  const addRow = useCallback((field: RowListField) => {
    setValues((prev) => ({ ...prev, [field]: [...prev[field], { ...EMPTY_ROW[field] }] }));
  }, []);

  const removeRow = useCallback((field: RowListField, index: number) => {
    setValues((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    if (field === 'precio') {
      // Re-key the remaining errors so they stay aligned with the shifted rows
      setPrecioErrors((prev) =>
        Object.entries(prev).reduce<PublicarRowErrors>((acc, [key, message]) => {
          const rowIndex = Number(key);
          if (rowIndex < index) acc[rowIndex] = message;
          else if (rowIndex > index) acc[rowIndex - 1] = message;
          return acc;
        }, {}),
      );
    }
  }, []);

  const updateRow = useCallback(
    (field: RowListField, index: number, key: RowFieldKey, value: string) => {
      setValues((prev) => ({
        ...prev,
        [field]: prev[field].map((row, i) => (i === index ? { ...row, [key]: value } : row)),
      }));
      if (field === 'precio') {
        setPrecioErrors((prev) => {
          if (!(index in prev)) return prev;
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    },
    [],
  );

  const setOmitirConfirmacionPlan = useCallback((value: boolean) => {
    setValues((prev) => ({ ...prev, omitirConfirmacionPlan: value }));
  }, []);

  const handleBannerFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setBannerError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setBannerFile(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setBannerError('Solo se permiten imágenes JPEG, PNG o WebP.');
      setBannerFile(null);
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setBannerError('El archivo no puede superar 2 MB.');
      setBannerFile(null);
      return;
    }

    setBannerFile(file);
    setBannerPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }, []);

  const submit = useCallback(async (): Promise<boolean> => {
    if (!training) return false;

    const trimmedNombre = values.nombre.trim();
    if (!trimmedNombre) {
      setSubmitError('El nombre de la publicación es obligatorio.');
      return false;
    }

    // Validate each price row independently so one bad amount flags only that
    // row, leaving the rest of the array editable (US-0109).
    const rowErrors: PublicarRowErrors = {};
    const parsedPrecio: PrecioItem[] = [];
    values.precio.forEach((row, index) => {
      const raw = row.precio.trim();
      const amount = Number(raw);
      if (!raw || Number.isNaN(amount) || amount < 0) {
        rowErrors[index] = 'El precio debe ser un número mayor o igual a cero.';
        return;
      }
      parsedPrecio.push({
        nombre: row.nombre.trim() || 'Precio general',
        precio: amount,
        descripcion: row.descripcion.trim() || null,
      });
    });

    const trimmedPaginaEventoUrl = values.paginaEventoUrl.trim();
    const urlError =
      trimmedPaginaEventoUrl && !isWellFormedUrl(trimmedPaginaEventoUrl)
        ? 'Ingresa una URL válida que empiece por http:// o https://.'
        : null;

    setPrecioErrors(rowErrors);
    setPaginaEventoUrlError(urlError);

    if (Object.keys(rowErrors).length > 0 || urlError) {
      setSubmitError('Revisa los campos marcados antes de publicar.');
      return false;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      let bannerUrl = existingBannerUrl;

      if (bannerFile) {
        const supabase = createClient();
        const result = await storageService.uploadEntrenamientoPublicoBanner(supabase, tenantId, training.id, bannerFile);
        bannerUrl = result.signedUrl;
      }

      await entrenamientosPublicosService.publicarEntrenamiento({
        tenantId,
        entrenamientoId: training.id,
        nombre: trimmedNombre,
        descripcion: values.descripcion.trim() || null,
        precio: parsedPrecio,
        descripcionLarga: values.descripcionLarga.trim() || null,
        paginaEventoUrl: trimmedPaginaEventoUrl || null,
        cronograma: values.cronograma
          .map((row) => ({ hora: row.hora.trim(), descripcion: row.descripcion.trim() }))
          .filter((row) => row.hora || row.descripcion),
        incluye: values.incluye
          .map((row) => ({ titulo: row.titulo.trim(), descripcion: row.descripcion.trim() }))
          .filter((row) => row.titulo || row.descripcion),
        banner_url: bannerUrl,
        omitirConfirmacionPlan: values.omitirConfirmacionPlan,
      });

      setIsOpen(false);
      reset();
      return true;
    } catch (err) {
      const message =
        err instanceof EntrenamientoPublicoServiceError || err instanceof Error
          ? err.message
          : 'No fue posible publicar el entrenamiento.';
      setSubmitError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [bannerFile, existingBannerUrl, reset, tenantId, training, values]);

  const despublicar = useCallback(async (): Promise<boolean> => {
    if (!publicacionId) return false;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await entrenamientosPublicosService.despublicarEntrenamiento(tenantId, publicacionId);
      setIsOpen(false);
      reset();
      return true;
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No fue posible despublicar el entrenamiento.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [publicacionId, reset, tenantId]);

  return {
    isOpen,
    training,
    isPublished: publicacionId !== null,
    isLoading,
    values,
    updateField,
    addRow,
    removeRow,
    updateRow,
    precioErrors,
    paginaEventoUrlError,
    setOmitirConfirmacionPlan,
    existingBannerUrl,
    bannerPreviewUrl,
    bannerError,
    handleBannerFileSelect,
    isSubmitting,
    submitError,
    open,
    close,
    submit,
    despublicar,
  };
}
