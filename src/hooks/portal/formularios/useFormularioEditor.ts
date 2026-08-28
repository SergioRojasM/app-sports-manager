'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  formulariosService,
  defaultHeaderSecciones,
  type EsquemaBatchCreateItem,
  type EsquemaBatchUpdateItem,
} from '@/services/supabase/portal/formularios.service';
import { slugify } from '@/lib/slugify';
import {
  FormularioServiceError,
  FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES,
  HEADER_SECCION_TIPOS,
  type FormularioPlantilla,
  type FormularioPlantillaDraft,
  type FormularioSeccion,
  type FormularioSeccionFormValues,
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

function makeDraftSeccion(plantillaId: string, seccionTipo: FormularioSeccion['seccion_tipo']): FormularioSeccion {
  return {
    id: draftId(),
    formulario_plantilla_id: plantillaId,
    seccion_tipo: seccionTipo,
    seccion_descripcion: '',
    seccion_subtitulo: null,
    campo_etiqueta: null,
    campo_nombre: null,
    campo_tipo: null,
    campo_lista_valores: null,
    campo_obligatorio: false,
    campo_placeholder: null,
    columna_ancho: 'completo',
    orden: 0,
    activo: true,
    created_at: '',
    updated_at: '',
  };
}

function toPlantillaDraft(plantilla: FormularioPlantilla): FormularioPlantillaDraft {
  return {
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion,
    activo: plantilla.activo,
    perfil_campos_requeridos: plantilla.perfil_campos_requeridos,
  };
}

/**
 * Draft-based editor state for one form template (US-0108). Every mutator below is a pure,
 * synchronous local-state update — nothing here writes to Supabase. `saveAll()` is the single
 * point where the accumulated draft (plantilla metadata + section creates/updates/deletes/
 * reorder) is persisted in one batched operation.
 */
export function useFormularioEditor({ plantillaId }: UseFormularioEditorOptions) {
  const [plantilla, setPlantilla] = useState<FormularioPlantilla | null>(null);
  const [plantillaDraft, setPlantillaDraft] = useState<FormularioPlantillaDraft | null>(null);
  const [secciones, setSecciones] = useState<FormularioSeccion[]>([]);
  const [unsavedIds, setUnsavedIds] = useState<Set<string>>(new Set());
  const [deletedPersistedIds, setDeletedPersistedIds] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await formulariosService.getPlantillaConSecciones(plantillaId);
      const { secciones: secs, ...plantillaData } = data;
      setPlantilla(plantillaData);
      setPlantillaDraft(toPlantillaDraft(plantillaData));

      const sorted = [...secs].sort((a, b) => a.orden - b.orden);
      const hasHeader = sorted.some((s) => (HEADER_SECCION_TIPOS as readonly string[]).includes(s.seccion_tipo));

      if (hasHeader) {
        setSecciones(sorted);
        setUnsavedIds(new Set());
        setDeletedPersistedIds(new Set());
        setDirty(false);
      } else {
        // Lazy header backfill (US-0108 decision): a template created before this change has
        // no encabezado_* rows — seed them locally now; they persist on the admin's next save.
        const headerDefaults = defaultHeaderSecciones(plantillaId, {
          titulo: plantillaData.nombre,
          subtitulo: plantillaData.descripcion,
        });
        const headerDrafts = headerDefaults.map((row) => ({
          ...makeDraftSeccion(plantillaId, row.seccion_tipo),
          seccion_descripcion: row.seccion_descripcion ?? null,
          campo_lista_valores: row.campo_lista_valores ?? null,
        }));
        setSecciones([...headerDrafts, ...sorted]);
        setUnsavedIds(new Set(headerDrafts.map((row) => row.id)));
        setDeletedPersistedIds(new Set());
        setDirty(true);
      }
    } catch (err) {
      setError(mapError(err, 'No fue posible cargar la plantilla.'));
    } finally {
      setLoading(false);
    }
  }, [plantillaId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Plantilla metadata draft ────────────────────────────────────────────
  const updatePlantillaField = useCallback((input: Partial<FormularioPlantillaDraft>) => {
    setPlantillaDraft((prev) => (prev ? { ...prev, ...input } : prev));
    setDirty(true);
  }, []);

  // ── Section draft mutators (local only) ─────────────────────────────────
  const addSeccion = useCallback(
    (insertBeforeId?: string | null): string => {
      const row = makeDraftSeccion(plantillaId, 'titulo');
      setSecciones((prev) => {
        if (!insertBeforeId) return [...prev, row];
        const idx = prev.findIndex((s) => s.id === insertBeforeId);
        if (idx === -1) return [...prev, row];
        return [...prev.slice(0, idx), row, ...prev.slice(idx)];
      });
      setUnsavedIds((prev) => new Set(prev).add(row.id));
      setDirty(true);
      return row.id;
    },
    [plantillaId],
  );

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

  const saveSeccion = useCallback(
    (id: string, values: FormularioSeccionFormValues): void => {
      setSecciones((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;

          if (values.seccion_tipo === 'datos') {
            const campoNombre = computeCampoNombre(values.campo_etiqueta, id);
            const usesLista = FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES.includes(values.campo_tipo);
            return {
              ...s,
              seccion_tipo: values.seccion_tipo,
              seccion_descripcion: null,
              seccion_subtitulo: null,
              campo_etiqueta: values.campo_etiqueta,
              campo_nombre: campoNombre,
              campo_tipo: values.campo_tipo,
              campo_lista_valores: usesLista ? values.campo_lista_valores : null,
              campo_obligatorio: values.campo_obligatorio,
              campo_placeholder: values.campo_placeholder || null,
              columna_ancho: values.columna_ancho,
            };
          }

          return {
            ...s,
            seccion_tipo: values.seccion_tipo,
            seccion_descripcion: values.seccion_tipo === 'encabezado_badges' ? null : values.seccion_descripcion,
            seccion_subtitulo: values.seccion_tipo === 'seccion' ? values.seccion_subtitulo || null : null,
            campo_etiqueta: null,
            campo_nombre: null,
            campo_tipo: null,
            campo_lista_valores: values.seccion_tipo === 'encabezado_badges' ? values.campo_lista_valores || null : null,
            campo_obligatorio: false,
            campo_placeholder: null,
            columna_ancho: 'completo',
          };
        }),
      );
      setDirty(true);
    },
    [computeCampoNombre],
  );

  /** Patches one of the 4 fixed header rows (found by `seccion_tipo`, unique per template) in place. */
  const updateHeaderSeccion = useCallback(
    (seccionTipo: FormularioSeccion['seccion_tipo'], patch: Partial<Pick<FormularioSeccion, 'seccion_descripcion' | 'campo_lista_valores'>>): void => {
      setSecciones((prev) => prev.map((s) => (s.seccion_tipo === seccionTipo ? { ...s, ...patch } : s)));
      setDirty(true);
    },
    [],
  );

  const deleteSeccion = useCallback(
    (id: string): void => {
      const wasUnsaved = unsavedIds.has(id);
      setSecciones((prev) => prev.filter((s) => s.id !== id));
      if (wasUnsaved) {
        setUnsavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        setDeletedPersistedIds((prev) => new Set(prev).add(id));
      }
      setDirty(true);
    },
    [unsavedIds],
  );

  const reorderSecciones = useCallback((orderedIds: string[]): void => {
    setSecciones((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      const next = orderedIds.map((id) => byId.get(id)).filter((s): s is FormularioSeccion => Boolean(s));
      return next.length === prev.length ? next : prev;
    });
    setDirty(true);
  }, []);

  // ── Batched save ─────────────────────────────────────────────────────────
  const saveAll = useCallback(async (): Promise<boolean> => {
    if (!plantilla || !plantillaDraft) return false;
    setSaving(true);
    setSaveError(null);

    try {
      const metadataChanged =
        plantillaDraft.nombre !== plantilla.nombre ||
        (plantillaDraft.descripcion ?? '') !== (plantilla.descripcion ?? '') ||
        plantillaDraft.activo !== plantilla.activo ||
        JSON.stringify(plantillaDraft.perfil_campos_requeridos) !== JSON.stringify(plantilla.perfil_campos_requeridos);

      if (metadataChanged) {
        await formulariosService.updatePlantilla(plantilla.id, {
          nombre: plantillaDraft.nombre,
          descripcion: plantillaDraft.descripcion,
          activo: plantillaDraft.activo,
          perfil_campos_requeridos: plantillaDraft.perfil_campos_requeridos,
        });
      }

      const toCreate: EsquemaBatchCreateItem[] = [];
      const toUpdate: EsquemaBatchUpdateItem[] = [];
      for (const s of secciones) {
        const input = {
          seccion_tipo: s.seccion_tipo,
          seccion_descripcion: s.seccion_descripcion,
          seccion_subtitulo: s.seccion_subtitulo,
          campo_etiqueta: s.campo_etiqueta ?? undefined,
          campo_nombre: s.campo_nombre ?? undefined,
          campo_tipo: s.campo_tipo ?? undefined,
          campo_lista_valores: s.campo_lista_valores,
          campo_obligatorio: s.campo_obligatorio,
          campo_placeholder: s.campo_placeholder,
          columna_ancho: s.columna_ancho,
        };
        if (unsavedIds.has(s.id)) {
          toCreate.push({ clientId: s.id, input });
        } else {
          toUpdate.push({ id: s.id, input });
        }
      }

      await formulariosService.saveEsquemaBatch(plantilla.id, {
        toCreate,
        toUpdate,
        toDeleteIds: Array.from(deletedPersistedIds),
        orderedClientIds: secciones.map((s) => s.id),
      });

      await load();
      return true;
    } catch (err) {
      setSaveError(mapError(err, 'No fue posible guardar los cambios.'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [plantilla, plantillaDraft, secciones, unsavedIds, deletedPersistedIds, load]);

  return {
    plantilla: plantillaDraft,
    secciones,
    unsavedIds,
    isDirty: dirty,
    loading,
    error,
    saving,
    saveError,
    updatePlantillaField,
    addSeccion,
    saveSeccion,
    updateHeaderSeccion,
    deleteSeccion,
    reorderSecciones,
    saveAll,
    refresh: load,
  };
}
