'use client';

import { useEffect } from 'react';
import type { EntrenamientoPlantilla, EntrenamientoPlantillaContenido } from '@/types/portal/entrenamiento-plantillas.types';

type PlantillasListModalProps = {
  open: boolean;
  plantillas: EntrenamientoPlantilla[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onUsePlantilla: (contenido: EntrenamientoPlantillaContenido) => void;
  onDeletePlantilla: (id: string) => Promise<boolean>;
};

const DESCRIPTION_MAX_LENGTH = 120;

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function truncateDescripcion(value: string | null): string {
  if (!value) return 'Sin descripción';
  if (value.length <= DESCRIPTION_MAX_LENGTH) return value;
  return `${value.slice(0, DESCRIPTION_MAX_LENGTH)}...`;
}

export function PlantillasListModal({
  open,
  plantillas,
  isLoading,
  error,
  onClose,
  onUsePlantilla,
  onDeletePlantilla,
}: PlantillasListModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleDelete = async (plantilla: EntrenamientoPlantilla) => {
    if (!window.confirm(`¿Eliminar la plantilla "${plantilla.nombre}"?`)) {
      return;
    }
    await onDeletePlantilla(plantilla.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar plantillas guardadas"
        onClick={onClose}
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plantillas guardadas"
        className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-grit-2xl border border-grit-glass-border bg-grit-card p-5 shadow-xl"
      >
        <h3 className="font-grit-title text-lg font-semibold text-grit-text">Plantillas guardadas</h3>
        <p className="mt-1 text-sm text-grit-subtext">Aplica una plantilla para reutilizar su configuración.</p>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">Cargando plantillas...</div>
          ) : error ? (
            <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
              {error}
            </div>
          ) : plantillas.length === 0 ? (
            <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
              Aún no has creado plantillas. Guarda la configuración de un entrenamiento como plantilla para reutilizarla.
            </div>
          ) : (
            plantillas.map((plantilla) => (
              <div
                key={plantilla.id}
                className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-grit-text">{plantilla.nombre}</p>
                    <p className="mt-0.5 text-xs text-grit-subtext">{truncateDescripcion(plantilla.descripcion)}</p>
                    <p className="mt-1 text-xs text-grit-muted">Actualizada: {formatUpdatedAt(plantilla.updated_at)}</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete(plantilla)}
                    className="rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-grit-danger transition hover:border-grit-danger/70"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => onUsePlantilla(plantilla.contenido)}
                    className="rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg"
                  >
                    Usar plantilla
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
