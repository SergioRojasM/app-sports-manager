'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNivelesDisciplina } from '@/hooks/portal/nivel-disciplina/useNivelesDisciplina';
import { NivelDisciplinaFormModal } from './NivelDisciplinaFormModal';
import type { NivelDisciplina } from '@/types/portal/nivel-disciplina.types';

type NivelesDisciplinaPanelProps = {
  tenantId: string;
  disciplinaId: string;
};

export function NivelesDisciplinaPanel({ tenantId, disciplinaId }: NivelesDisciplinaPanelProps) {
  const { niveles, loading, error, successMessage, loadNiveles, createNivel, updateNivel, deleteNivel } =
    useNivelesDisciplina({ tenantId, disciplinaId });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<NivelDisciplina | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void loadNiveles();
  }, [loadNiveles]);

  const openCreate = () => {
    setEditTarget(null);
    setModalMode('create');
    setSubmitError(null);
    setModalOpen(true);
  };

  const openEdit = (nivel: NivelDisciplina) => {
    setEditTarget(nivel);
    setModalMode('edit');
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleCreate: typeof createNivel = async (input) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const ok = await createNivel(input);
    setIsSubmitting(false);
    if (!ok) setSubmitError(error ?? 'Error al crear el nivel.');
    return ok;
  };

  const handleUpdate: typeof updateNivel = async (id, input) => {
    setIsSubmitting(true);
    setSubmitError(null);
    const ok = await updateNivel(id, input);
    setIsSubmitting(false);
    if (!ok) setSubmitError(error ?? 'Error al actualizar el nivel.');
    return ok;
  };

  const confirmDelete = async (id: string) => {
    const ok = await deleteNivel(id);
    if (ok) setDeleteConfirmId(null);
  };

  return (
    <tr>
      <td colSpan={3} className="p-0">
        <div className="border-t border-grit-glass-border bg-grit-bg/30 px-8 py-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-grit-subtext">Niveles de progresión</h4>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-1.5 text-xs font-semibold text-grit-text transition hover:text-grit-cyan"
            >
              + Agregar nivel
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-xs text-grit-subtext">Cargando niveles...</p>
          ) : error && niveles.length === 0 ? (
            <div className="mt-3 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
              {error}
            </div>
          ) : niveles.length === 0 ? (
            <p className="mt-3 text-xs text-grit-subtext">No hay niveles creados para esta disciplina.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-grit-md border border-grit-glass-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-grit-card text-xs uppercase tracking-wider text-grit-subtext">
                  <tr>
                    <th className="px-4 py-2">Orden</th>
                    <th className="px-4 py-2">Nombre</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grit-glass-border">
                  {niveles.map((nivel) => (
                    <tr key={nivel.id} className="hover:bg-grit-card">
                      <td className="px-4 py-2 text-grit-subtext">{nivel.orden}</td>
                      <td className="px-4 py-2 font-medium text-grit-text">{nivel.nombre}</td>
                      <td className="px-4 py-2">
                        <span
                          className={[
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                            nivel.activo
                              ? 'border border-emerald-400/40 bg-emerald-900/25 text-emerald-200'
                              : 'border border-grit-glass-border bg-grit-card text-grit-subtext',
                          ].join(' ')}
                        >
                          <span className={['h-1.5 w-1.5 rounded-full', nivel.activo ? 'bg-emerald-300' : 'bg-grit-subtext/20'].join(' ')} />
                          {nivel.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(nivel)}
                            className="rounded-grit-md border border-grit-glass-border bg-grit-card px-2.5 py-1 text-xs font-semibold text-grit-text transition hover:text-grit-cyan"
                          >
                            Editar
                          </button>
                          {deleteConfirmId === nivel.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void confirmDelete(nivel.id)}
                                className="rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-grit-danger transition hover:bg-rose-500/20"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-grit-md border border-grit-glass-border px-2.5 py-1 text-xs font-semibold text-grit-subtext"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(nivel.id)}
                              className="rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-grit-danger transition hover:bg-rose-500/20"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {successMessage && !error ? (
            <p className="mt-2 text-xs text-emerald-300">{successMessage}</p>
          ) : null}

          {error && niveles.length > 0 ? (
            <div className="mt-2 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
              {error}
            </div>
          ) : null}
        </div>

      </td>

      {modalOpen
        ? createPortal(
            <NivelDisciplinaFormModal
              open={modalOpen}
              mode={modalMode}
              tenantId={tenantId}
              disciplinaId={disciplinaId}
              initial={editTarget}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onClose={() => setModalOpen(false)}
              onCreate={handleCreate}
              onUpdate={handleUpdate}
            />,
            document.body,
          )
        : null}
    </tr>
  );
}
