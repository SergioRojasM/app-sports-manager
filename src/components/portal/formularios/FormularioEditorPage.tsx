'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useFormularioEditor } from '@/hooks/portal/formularios/useFormularioEditor';
import { FormularioSeccionesBuilder } from './FormularioSeccionesBuilder';
import { FormularioPreviewModal } from './FormularioPreviewModal';

type FormularioEditorPageProps = {
  tenantId: string;
  plantillaId: string;
};

export function FormularioEditorPage({ tenantId, plantillaId }: FormularioEditorPageProps) {
  const {
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
  } = useFormularioEditor({ plantillaId });

  const [nombreDraft, setNombreDraft] = useState('');
  const [descripcionDraft, setDescripcionDraft] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (plantilla) {
      setNombreDraft(plantilla.nombre);
      setDescripcionDraft(plantilla.descripcion ?? '');
    }
  }, [plantilla]);

  if (loading) {
    return (
      <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
        Cargando plantilla...
      </div>
    );
  }

  if (error || !plantilla) {
    return (
      <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
        <p className="text-sm text-rose-200">{error ?? 'No fue posible cargar la plantilla.'}</p>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/portal/orgs/${tenantId}/gestion-formularios`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-turquoise"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
        Volver a Formularios
      </Link>

      <header className="glass space-y-4 rounded-xl border border-portal-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plantilla-editor-nombre">
                Nombre
              </label>
              <input
                id="plantilla-editor-nombre"
                type="text"
                value={nombreDraft}
                onChange={(e) => setNombreDraft(e.target.value)}
                onBlur={() => {
                  if (nombreDraft.trim() && nombreDraft.trim() !== plantilla.nombre) {
                    void updatePlantillaField({ nombre: nombreDraft });
                  }
                }}
                className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-2xl font-semibold text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plantilla-editor-descripcion">
                Descripción
              </label>
              <textarea
                id="plantilla-editor-descripcion"
                rows={2}
                value={descripcionDraft}
                onChange={(e) => setDescripcionDraft(e.target.value)}
                onBlur={() => {
                  if (descripcionDraft !== (plantilla.descripcion ?? '')) {
                    void updatePlantillaField({ descripcion: descripcionDraft || null });
                  }
                }}
                placeholder="Descripción opcional de la plantilla"
                className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-300 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-portal-border pt-4">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={plantilla.activo}
              onChange={(e) => void updatePlantillaField({ activo: e.target.checked })}
              className="rounded border-slate-600 bg-navy-deep"
            />
            Plantilla activa
          </label>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-portal-border bg-navy-deep/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-turquoise/50 hover:text-turquoise"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">visibility</span>
            Vista previa
          </button>
        </div>
      </header>

      <FormularioSeccionesBuilder
        secciones={secciones}
        unsavedIds={unsavedIds}
        seccionError={seccionError}
        onAddSeccion={addSeccion}
        onSaveSeccion={saveSeccion}
        onDeleteSeccion={(id) => void deleteSeccion(id)}
        onReorder={(orderedIds) => void reorderSecciones(orderedIds)}
      />

      <FormularioPreviewModal
        open={previewOpen}
        plantillaNombre={plantilla.nombre}
        secciones={secciones}
        onClose={() => setPreviewOpen(false)}
      />
    </section>
  );
}
