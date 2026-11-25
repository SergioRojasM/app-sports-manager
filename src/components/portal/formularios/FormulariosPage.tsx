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
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando plantillas...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-8 text-center">
      <span className="material-symbols-outlined mb-3 block text-4xl text-grit-muted" aria-hidden="true">
        description
      </span>
      <p className="text-sm font-medium text-grit-subtext">No hay plantillas de formularios registradas.</p>
      <p className="mt-1 text-xs text-grit-muted">
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
    forceDeletePlantilla,
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

  const handleDelete = async (plantilla: FormularioPlantillaListItem) => {
    clearDeleteError();
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar la plantilla "${plantilla.nombre}"? Se eliminarán también todas sus secciones. Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    const result = await deletePlantilla(plantilla.id);
    if (result.ok || result.code !== 'in_use') return;

    // Still referenced by one or more trainings' formulario_id — offer to detach and retry.
    const confirmedForce = window.confirm(
      'Esta plantilla está siendo usada en algún entrenamiento. ¿Deseas eliminarla de todas formas? Se quitará el formulario de esos entrenamientos.',
    );
    if (!confirmedForce) return;

    await forceDeletePlantilla(plantilla.id);
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
          <h1 className="font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]">Formularios</h1>
          <p className="mt-2 text-sm text-grit-subtext">
            Gestiona las plantillas de formularios que se utilizarán en los entrenamientos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2.5 text-sm font-semibold text-grit-bg transition-all duration-200 hover:bg-grit-cyan/85 hover:shadow-lg hover:shadow-grit-cyan/25"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
          Nueva plantilla
        </button>
      </header>

      {deleteError ? (
        <div
          className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
          role="alert"
        >
          {deleteError}
        </div>
      ) : null}

      {isLoading ? <LoadingState /> : null}

      {!isLoading && error ? (
        <div className="border backdrop-blur-md rounded-grit-2xl border-grit-danger/25 bg-grit-danger/10 p-6">
          <p className="text-sm text-grit-danger">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-grit-md border border-grit-danger/30 px-3 py-2 text-xs font-semibold text-grit-danger"
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
        tenantId={tenantId}
        plantillaNombre={previewPlantilla?.nombre ?? ''}
        secciones={previewSecciones}
        loading={previewLoading}
        error={previewError}
        onClose={() => setPreviewPlantilla(null)}
      />
    </section>
  );
}
