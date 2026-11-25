'use client';

import { useEffect, useState } from 'react';
import { useUsuarioNivelDisciplina } from '@/hooks/portal/gestion-equipo/useUsuarioNivelDisciplina';

type AsignarNivelModalProps = {
  open: boolean;
  tenantId: string;
  usuarioId: string;
  onClose: () => void;
};

export function AsignarNivelModal({ open, tenantId, usuarioId, onClose }: AsignarNivelModalProps) {
  const { disciplinasConNiveles, loading, error, successMessage, asignarNivel } =
    useUsuarioNivelDisciplina({ tenantId, usuarioId });

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Pre-populate selections from current assignments
    const initial: Record<string, string> = {};
    for (const d of disciplinasConNiveles) {
      if (d.nivel_actual_id) initial[d.disciplina_id] = d.nivel_actual_id;
    }
    setSelections(initial);
  }, [open, disciplinasConNiveles]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [submitting, onClose, open]);

  if (!open) return null;

  const handleSave = async () => {
    setSubmitting(true);
    for (const [disciplina_id, nivel_id] of Object.entries(selections)) {
      if (!nivel_id) continue;
      await asignarNivel({ usuario_id: usuarioId, tenant_id: tenantId, disciplina_id, nivel_id });
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar asignar nivel"
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={submitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Asignar nivel"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">Asignar nivel</h2>
            <p className="mt-1 text-xs text-grit-subtext">Selecciona el nivel de cada disciplina para este atleta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-xs text-grit-subtext">Cargando disciplinas y niveles...</p>
          ) : error ? (
            <div className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">{error}</div>
          ) : disciplinasConNiveles.length === 0 ? (
            <p className="text-xs text-grit-subtext">No hay disciplinas con niveles activos en esta organización.</p>
          ) : (
            disciplinasConNiveles.map((d) => (
              <div key={d.disciplina_id}>
                <label className="mb-1 block text-xs text-grit-subtext">{d.disciplina_nombre}</label>
                <select
                  value={selections[d.disciplina_id] ?? ''}
                  onChange={(e) => setSelections((prev) => ({ ...prev, [d.disciplina_id]: e.target.value }))}
                  disabled={submitting}
                  className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
                >
                  <option value="">Sin asignar</option>
                  {d.niveles.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.orden}. {n.nombre}
                    </option>
                  ))}
                </select>
              </div>
            ))
          )}

          {successMessage ? (
            <p className="text-xs text-emerald-300">{successMessage}</p>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting || loading || disciplinasConNiveles.length === 0}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar niveles'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
