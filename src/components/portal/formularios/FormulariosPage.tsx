'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormularios } from '@/hooks/portal/formularios/useFormularios';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import { FormularioServiceError } from '@/types/portal/formularios.types';
import { FormularioFormModal } from './FormularioFormModal';
import { FormulariosTable } from './FormulariosTable';
import { FormularioPreviewModal } from './FormularioPreviewModal';
import type { FormularioPlantillaListItem, FormularioPlantillaFormValues, FormularioSeccion } from '@/types/portal/formularios.types';

type FormulariosPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando plantillas...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-slate-500" aria-hidden="true">
        description
      </span>
      <p className="text-sm font-medium text-slate-300">No hay plantillas de formularios registradas.</p>
      <p className="mt-1 text-xs text-slate-500">
        Crea tu primera plantilla para definir los campos que se recogerán en los entrenamientos.
      </p>
    </div>
  );
}

export function FormulariosPage({ tenantId }: FormulariosPageProps) {
  const router = useRouter();
  const {
    plantillas,
    isLoading,
    error,
    isModalOpen,
    submitError,
    deleteError,
    openCreateModal,
    closeModal,
    createPlantilla,
    deletePlantilla,
    clearDeleteError,
    refresh,
  } = useFormularios({ tenantId });

  const [previewPlantilla, setPreviewPlantilla] = useState<FormularioPlantillaListItem | null>(null);
  const [previewSecciones, setPreviewSecciones] = useState<FormularioSeccion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const handleCreate = async (values: FormularioPlantillaFormValues): Promise<boolean> => {
    const created = await createPlantilla({
      tenant_id: tenantId,
      nombre: values.nombre,
      descripcion: values.descripcion.trim() || null,
    });
    if (created) {
      router.push(`/portal/orgs/${tenantId}/gestion-formularios/${created.id}`);
      return true;
    }
    return false;
  };

  const handleDelete = (plantilla: FormularioPlantillaListItem) => {
    clearDeleteError();
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la plantilla "${plantilla.nombre}"? Se eliminarán también todas sus secciones. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    void deletePlantilla(plantilla.id);
  };

  const handlePreview = async (plantilla: FormularioPlantillaListItem) => {
    setPreviewPlantilla(plantilla);
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const data = await formulariosService.getPlantillaConSecciones(plantilla.id);
      setPreviewSecciones(data.secciones);
    } catch (err) {
      setPreviewError(err instanceof FormularioServiceError ? err.message : 'No fue posible cargar la vista previa.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-100">Formularios</h1>
          <p className="mt-2 text-sm text-slate-400">
            Gestiona las plantillas de formularios que se utilizarán en los entrenamientos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2.5 text-sm font-semibold text-navy-deep transition-all duration-200 hover:bg-turquoise/85 hover:shadow-lg hover:shadow-turquoise/25"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          Nueva plantilla
        </button>
      </header>

      {deleteError ? (
        <div
          className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
          role="alert"
        >
          {deleteError}
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
        <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
            onClick={() => void refresh()}
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {!isLoading && !error && plantillas.length === 0 ? <EmptyState /> : null}

      {!isLoading && !error && plantillas.length > 0 ? (
        <FormulariosTable tenantId={tenantId} rows={plantillas} onPreview={(p) => void handlePreview(p)} onDelete={handleDelete} />
      ) : null}

      <FormularioFormModal open={isModalOpen} submitError={submitError} onClose={closeModal} onSubmit={handleCreate} />

      <FormularioPreviewModal
        open={previewPlantilla !== null}
        plantillaNombre={previewPlantilla?.nombre ?? ''}
        secciones={previewSecciones}
        loading={previewLoading}
        error={previewError}
        onClose={() => setPreviewPlantilla(null)}
      />
    </section>
  );
}
