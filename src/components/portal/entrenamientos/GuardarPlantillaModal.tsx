'use client';

import { useEffect, useState } from 'react';

type GuardarPlantillaModalProps = {
  open: boolean;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (nombre: string, descripcion: string | null) => Promise<boolean>;
};

export function GuardarPlantillaModal({ open, isSaving, error, onClose, onSave }: GuardarPlantillaModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNombre('');
      setDescripcion('');
    }
  }

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSaving) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSaving, onClose, open]);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) return;

    const success = await onSave(trimmedNombre, descripcion.trim() || null);
    if (success) {
      setNombre('');
      setDescripcion('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Cerrar guardar plantilla"
        onClick={onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Guardar configuración como plantilla"
        className="relative z-10 w-full max-w-md rounded-grit-2xl border border-grit-glass-border bg-grit-card p-5 shadow-xl"
      >
        <h3 className="font-grit-title text-lg font-semibold text-grit-text">Guardar como plantilla</h3>
        <p className="mt-1 text-sm text-grit-subtext">
          Guarda la configuración actual para reutilizarla en futuros entrenamientos.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor="plantilla-nombre" className="block text-sm font-medium text-grit-text">
              Nombre <span className="text-grit-danger">*</span>
            </label>
            <input
              id="plantilla-nombre"
              type="text"
              maxLength={150}
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              disabled={isSaving}
              className="mt-1 w-full rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-3 py-2 text-sm text-grit-text focus:border-grit-cyan/70 focus:outline-none"
              placeholder="Ej. Entrenamiento de resistencia - principiantes"
            />
          </div>

          <div>
            <label htmlFor="plantilla-descripcion" className="block text-sm font-medium text-grit-text">
              Descripción
            </label>
            <textarea
              id="plantilla-descripcion"
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              disabled={isSaving}
              rows={3}
              className="mt-1 w-full rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-3 py-2 text-sm text-grit-text focus:border-grit-cyan/70 focus:outline-none"
              placeholder="Opcional"
            />
          </div>

          {error ? (
            <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving || !nombre.trim()}
            className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
