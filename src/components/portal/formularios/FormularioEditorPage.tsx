'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useFormularioEditor } from '@/hooks/portal/formularios/useFormularioEditor';
import { FormularioHeaderEditor } from './FormularioHeaderEditor';
import { FormularioSeccionesBuilder } from './FormularioSeccionesBuilder';
import { FormularioPreviewModal } from './FormularioPreviewModal';
import { FORMULARIO_PERFIL_CAMPOS, HEADER_SECCION_TIPOS, type FormularioPerfilCampo } from '@/types/portal/formularios.types';

type FormularioEditorPageProps = {
  tenantId: string;
  plantillaId: string;
};

export function FormularioEditorPage({ tenantId, plantillaId }: FormularioEditorPageProps) {
  const {
    plantilla,
    secciones,
    unsavedIds,
    isDirty,
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
  } = useFormularioEditor({ plantillaId });

  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const bodySecciones = useMemo(
    () => secciones.filter((s) => !(HEADER_SECCION_TIPOS as readonly string[]).includes(s.seccion_tipo)),
    [secciones],
  );

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
    <section className="mx-auto max-w-2xl space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/portal/orgs/${tenantId}/gestion-formularios`}
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-turquoise"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_back</span>
          Volver a Formularios
        </Link>

        {isDirty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-900/20 px-3 py-1 text-xs font-semibold text-amber-300">
            <span className="material-symbols-outlined text-sm" aria-hidden="true">edit_note</span>
            Cambios sin guardar
          </span>
        ) : null}
      </div>

      <div className="glass overflow-hidden rounded-xl border border-portal-border">
        <FormularioHeaderEditor tenantId={tenantId} secciones={secciones} onUpdateHeaderField={updateHeaderSeccion} />

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor="plantilla-editor-nombre">
              Nombre
            </label>
            <input
              id="plantilla-editor-nombre"
              type="text"
              value={plantilla.nombre}
              onChange={(e) => updatePlantillaField({ nombre: e.target.value })}
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
              value={plantilla.descripcion ?? ''}
              onChange={(e) => updatePlantillaField({ descripcion: e.target.value || null })}
              placeholder="Descripción opcional de la plantilla"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-300 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          <div className="flex items-center justify-between border-t border-portal-border pt-4">
            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={plantilla.activo}
                onChange={(e) => updatePlantillaField({ activo: e.target.checked })}
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

          {/* Datos de perfil requeridos (US-0095) */}
          <div className="border-t border-portal-border pt-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Datos de perfil requeridos
            </p>
            <p className="mb-3 text-xs text-slate-500">
              Selecciona los datos del perfil del atleta que este formulario necesita — evita pedirlos de nuevo como
              secciones de &quot;Datos&quot;.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              {(['personal', 'deportivo'] as const).map((grupo) => (
                <div key={grupo}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {grupo === 'personal' ? 'Datos personales' : 'Datos deportivos'}
                  </p>
                  <div className="space-y-2">
                    {FORMULARIO_PERFIL_CAMPOS.filter((c) => c.grupo === grupo).map((campo) => (
                      <label key={campo.key} className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={plantilla.perfil_campos_requeridos.includes(campo.key)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next: FormularioPerfilCampo[] = checked
                              ? [...plantilla.perfil_campos_requeridos, campo.key]
                              : plantilla.perfil_campos_requeridos.filter((k) => k !== campo.key);
                            updatePlantillaField({ perfil_campos_requeridos: next });
                          }}
                          className="rounded border-slate-600 bg-navy-deep"
                        />
                        {campo.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FormularioSeccionesBuilder
        secciones={bodySecciones}
        unsavedIds={unsavedIds}
        onAddSeccion={addSeccion}
        onSaveSeccion={saveSeccion}
        onDeleteSeccion={deleteSeccion}
        onReorder={reorderSecciones}
      />

      <FormularioPreviewModal
        open={previewOpen}
        tenantId={tenantId}
        plantillaNombre={plantilla.nombre}
        secciones={secciones}
        perfilCamposRequeridos={plantilla.perfil_campos_requeridos}
        onClose={() => setPreviewOpen(false)}
      />

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-portal-border bg-navy-deep/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="min-h-5 text-sm text-rose-300">{saveError}</div>
          <button
            type="button"
            onClick={() => void saveAll()}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-5 py-2.5 text-sm font-semibold text-navy-deep transition-all duration-200 hover:bg-turquoise/85 hover:shadow-lg hover:shadow-turquoise/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </div>
      </div>
    </section>
  );
}
