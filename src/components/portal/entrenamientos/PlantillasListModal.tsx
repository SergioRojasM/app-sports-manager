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
        className="absolute inset-0 bg-slate-950/70"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plantillas guardadas"
        className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-xl border border-portal-border bg-navy-medium p-5 shadow-xl"
      >
        <h3 className="text-lg font-semibold text-slate-100">Plantillas guardadas</h3>
        <p className="mt-1 text-sm text-slate-400">Aplica una plantilla para reutilizar su configuración.</p>

        <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">Cargando plantillas...</div>
          ) : error ? (
            <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
              {error}
            </div>
          ) : plantillas.length === 0 ? (
            <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
              Aún no has creado plantillas. Guarda la configuración de un entrenamiento como plantilla para reutilizarla.
            </div>
          ) : (
            plantillas.map((plantilla) => (
              <div
                key={plantilla.id}
                className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{plantilla.nombre}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{truncateDescripcion(plantilla.descripcion)}</p>
                    <p className="mt-1 text-xs text-slate-500">Actualizada: {formatUpdatedAt(plantilla.updated_at)}</p>
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDelete(plantilla)}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:border-rose-300/70"
                  >
                    Eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => onUsePlantilla(plantilla.contenido)}
                    className="rounded-lg bg-turquoise px-3 py-1.5 text-xs font-semibold text-navy-deep"
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
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
