'use client';

import { useCallback, useEffect, useState } from 'react';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { slugify } from '@/lib/slugify';
import {
  FormularioServiceError,
  type FormularioPlantilla,
  type FormularioSeccion,
  type FormularioSeccionFormValues,
  type UpdatePlantillaInput,
} from '@/types/portal/formularios.types';

type UseFormularioEditorOptions = {
  plantillaId: string;
};

function mapError(err: unknown, fallback: string): string {
  if (err instanceof FormularioServiceError) return err.message;
  return fallback;
}

function draftId(): string {
  return `draft-${crypto.randomUUID()}`;
}

export function useFormularioEditor({ plantillaId }: UseFormularioEditorOptions) {
  const [plantilla, setPlantilla] = useState<FormularioPlantilla | null>(null);
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seccionError, setSeccionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await formulariosService.getPlantillaConSecciones(plantillaId);
      const { secciones: secs, ...plantillaData } = data;
      setPlantilla(plantillaData);
      setSecciones(secs);
      setUnsavedIds(new Set());
    } catch (err) {
      setError(mapError(err, 'No fue posible cargar la plantilla.'));
    } finally {
      setLoading(false);
    }
  }, [plantillaId]);

  useEffect(() => {
    void load();
  }, [load]);

  const updatePlantillaField = useCallback(
    async (input: UpdatePlantillaInput) => {
      if (!plantilla) return;
      try {
        const updated = await formulariosService.updatePlantilla(plantilla.id, input);
        setPlantilla(updated);
      } catch (err) {
        setError(mapError(err, 'No fue posible guardar los cambios de la plantilla.'));
      }
    },
    [plantilla],
  );

  const addSeccion = useCallback((): string => {
    const id = draftId();
    setSecciones((prev) => [
      ...prev,
      {
        id,
        formulario_plantilla_id: plantillaId,
        seccion_tipo: 'titulo',
        seccion_descripcion: '',
        campo_etiqueta: null,
        campo_nombre: null,
        campo_tipo: null,
        campo_lista_valores: null,
        campo_obligatorio: false,
        campo_placeholder: null,
        orden: prev.length,
        activo: true,
        created_at: '',
        updated_at: '',
      },
    ]);
    setUnsavedIds((prev) => new Set(prev).add(id));
    return id;
  }, [plantillaId]);

  const computeCampoNombre = useCallback(
    (etiqueta: string, excludeId: string, extraSuffix = ''): string => {
      const base = slugify(etiqueta) + extraSuffix;
      const taken = new Set(
        secciones.filter((s) => s.id !== excludeId && s.campo_nombre).map((s) => s.campo_nombre as string),
      );
      if (!taken.has(base)) return base;
      let n = 2;
      while (taken.has(`${base}_${n}`)) n += 1;
      return `${base}_${n}`;
    },
    [secciones],
  );

  const replaceSeccion = useCallback((id: string, saved: FormularioSeccion) => {
    setSecciones((prev) => prev.map((s) => (s.id === id ? saved : s)));
    setUnsavedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const saveSeccion = useCallback(
    async (id: string, values: FormularioSeccionFormValues): Promise<boolean> => {
      setSeccionError(null);
      const isNew = unsavedIds.has(id);
      const current = secciones.find((s) => s.id === id);
      const orden = current?.orden ?? secciones.length;

      const basePayload =
        values.seccion_tipo === 'datos'
          ? {
              seccion_tipo: values.seccion_tipo,
              campo_etiqueta: values.campo_etiqueta,
              campo_tipo: values.campo_tipo,
              campo_lista_valores: values.campo_lista_valores,
              campo_placeholder: values.campo_placeholder || null,
              campo_obligatorio: values.campo_obligatorio,
            }
          : {
              seccion_tipo: values.seccion_tipo,
              seccion_descripcion: values.seccion_descripcion,
            };

      try {
        if (values.seccion_tipo === 'datos') {
          const campoNombre = computeCampoNombre(values.campo_etiqueta, id);
          const payload = { ...basePayload, campo_nombre: campoNombre };
          try {
            const saved = isNew
              ? await formulariosService.createSeccion({ formulario_plantilla_id: plantillaId, orden, ...payload })
              : await formulariosService.updateSeccion(id, payload);
            replaceSeccion(id, saved);
          } catch (err) {
            if (err instanceof FormularioServiceError && err.code === 'duplicate_campo_nombre') {
              const retryPayload = { ...payload, campo_nombre: computeCampoNombre(values.campo_etiqueta, id, `_${Date.now() % 1000}`) };
              const saved = isNew
                ? await formulariosService.createSeccion({ formulario_plantilla_id: plantillaId, orden, ...retryPayload })
                : await formulariosService.updateSeccion(id, retryPayload);
              replaceSeccion(id, saved);
            } else {
              throw err;
            }
          }
        } else {
          const saved = isNew
            ? await formulariosService.createSeccion({ formulario_plantilla_id: plantillaId, orden, ...basePayload })
            : await formulariosService.updateSeccion(id, basePayload);
          replaceSeccion(id, saved);
        }
        return true;
      } catch (err) {
        setSeccionError(mapError(err, 'No fue posible guardar la sección.'));
        return false;
      }
    },
    [secciones, unsavedIds, plantillaId, computeCampoNombre, replaceSeccion],
  );

  const deleteSeccion = useCallback(
    async (id: string): Promise<boolean> => {
      setSeccionError(null);
      if (unsavedIds.has(id)) {
        setSecciones((prev) => prev.filter((s) => s.id !== id));
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return true;
      }
      try {
        await formulariosService.deleteSeccion(id);
        setSecciones((prev) => prev.filter((s) => s.id !== id));
        return true;
      } catch (err) {
        setSeccionError(mapError(err, 'No fue posible eliminar la sección.'));
        return false;
      }
    },
    [unsavedIds],
  );

  const reorderSecciones = useCallback(
    async (orderedIds: string[]): Promise<boolean> => {
      setSeccionError(null);
      try {
        await formulariosService.reorderSecciones(plantillaId, orderedIds);
        setSecciones((prev) =>
          prev
            .map((s) => {
              const index = orderedIds.indexOf(s.id);
              return index === -1 ? s : { ...s, orden: index };
            })
            .sort((a, b) => a.orden - b.orden),
        );
        return true;
      } catch (err) {
        setSeccionError(mapError(err, 'No fue posible reordenar las secciones.'));
        return false;
      }
    },
    [plantillaId],
  );

  return {
    plantilla,
    secciones,
    unsavedIds,
    loading,
    error,
    seccionError,
    updatePlantillaField,
    addSeccion,
    saveSeccion,
    deleteSeccion,
    reorderSecciones,
    refresh: load,
  };
}
