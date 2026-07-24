'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { entrenamientosPublicosService } from '@/services/supabase/portal/entrenamientos-publicos.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import {
  EntrenamientoPublicoServiceError,
  type EntrenamientoPublicoFormValues,
} from '@/types/portal/entrenamientos-publicos.types';
import type { TrainingInstance } from '@/types/portal/entrenamientos.types';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MiB

const EMPTY_VALUES: EntrenamientoPublicoFormValues = {
  nombre: '',
  descripcion: '',
  precio: '',
};

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
            precio: publicacion.precio != null ? String(publicacion.precio) : '',
          });
          setExistingBannerUrl(publicacion.banner_url);
        } else {
          setValues({
            nombre: target.nombre,
            descripcion: target.descripcion ?? '',
            precio: '',
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

  const updateField = useCallback((field: keyof EntrenamientoPublicoFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
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

    const parsedPrecio = values.precio.trim() ? Number(values.precio) : null;
    if (parsedPrecio != null && (Number.isNaN(parsedPrecio) || parsedPrecio < 0)) {
      setSubmitError('El precio debe ser un número mayor o igual a cero.');
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
        banner_url: bannerUrl,
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
