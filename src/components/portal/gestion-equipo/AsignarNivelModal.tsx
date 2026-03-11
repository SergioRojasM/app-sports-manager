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
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={submitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Asignar nivel"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Asignar nivel</h2>
            <p className="mt-1 text-xs text-slate-400">Selecciona el nivel de cada disciplina para este atleta.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">close</span>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-xs text-slate-400">Cargando disciplinas y niveles...</p>
          ) : error ? (
            <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">{error}</div>
          ) : disciplinasConNiveles.length === 0 ? (
            <p className="text-xs text-slate-400">No hay disciplinas con niveles activos en esta organización.</p>
          ) : (
            disciplinasConNiveles.map((d) => (
              <div key={d.disciplina_id}>
                <label className="mb-1 block text-xs text-slate-300">{d.disciplina_nombre}</label>
                <select
                  value={selections[d.disciplina_id] ?? ''}
                  onChange={(e) => setSelections((prev) => ({ ...prev, [d.disciplina_id]: e.target.value }))}
                  disabled={submitting}
                  className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
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

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={submitting || loading || disciplinasConNiveles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep disabled:opacity-50"
          >
            {submitting ? 'Guardando...' : 'Guardar niveles'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">save</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
