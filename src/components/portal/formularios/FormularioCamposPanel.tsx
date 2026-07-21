'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFormularioEsquema } from '@/hooks/portal/formularios/useFormularioEsquema';
import { FormularioCampoFormModal } from './FormularioCampoFormModal';
import { FormularioTipoCampoBadge } from './FormularioTipoCampoBadge';
import type { FormularioCampo, FormularioCampoFormValues } from '@/types/portal/formularios.types';

type FormularioCamposPanelProps = {
  plantillaId: string;
  colSpan: number;
};

export function FormularioCamposPanel({ plantillaId, colSpan }: FormularioCamposPanelProps) {
  const { campos, loading, error, successMessage, loadCampos, createCampo, updateCampo, deleteCampo, reorderCampos } =
    useFormularioEsquema({ plantillaId });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<FormularioCampo | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    void loadCampos();
  }, [loadCampos]);

  const openCreate = () => {
    setEditTarget(null);
    setModalMode('create');
    setSubmitError(null);
    setModalOpen(true);
  };

  const openEdit = (campo: FormularioCampo) => {
    setEditTarget(campo);
    setModalMode('edit');
    setSubmitError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (values: FormularioCampoFormValues): Promise<boolean> => {
    setSubmitError(null);
    const ok =
      modalMode === 'create'
        ? await createCampo({
            formulario_plantilla_id: plantillaId,
            campo_etiqueta: values.campo_etiqueta,
            campo_nombre: values.campo_nombre,
            campo_tipo: values.campo_tipo,
            campo_lista_valores: values.campo_lista_valores,
            campo_obligatorio: values.campo_obligatorio,
            orden: Number(values.orden),
          })
        : editTarget
          ? await updateCampo(editTarget.id, {
              campo_etiqueta: values.campo_etiqueta,
              campo_nombre: values.campo_nombre,
              campo_tipo: values.campo_tipo,
              campo_lista_valores: values.campo_lista_valores,
              campo_obligatorio: values.campo_obligatorio,
              orden: Number(values.orden),
            })
          : false;

    if (!ok) setSubmitError(error ?? 'Error al guardar el campo.');
    return ok;
  };

  const confirmDelete = async (id: string) => {
    const ok = await deleteCampo(id);
    if (ok) setDeleteConfirmId(null);
  };

  const moveCampo = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= campos.length) return;
    const orderedIds = campos.map((c) => c.id);
    [orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
    void reorderCampos(orderedIds);
  };

  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
        <div className="border-t border-portal-border bg-navy-deep/30 px-8 py-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Campos del formulario</h4>
            <button
              type="button"
              onClick={openCreate}
              className="rounded-lg border border-portal-border bg-navy-medium px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
            >
              + Agregar campo
            </button>
          </div>

          {loading ? (
            <p className="mt-3 text-xs text-slate-400">Cargando campos...</p>
          ) : error && campos.length === 0 ? (
            <div className="mt-3 rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : campos.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">Esta plantilla aún no tiene campos.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-portal-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-navy-medium/60 text-xs uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Orden</th>
                    <th className="px-4 py-2">Etiqueta</th>
                    <th className="px-4 py-2">Nombre interno</th>
                    <th className="px-4 py-2">Tipo</th>
                    <th className="px-4 py-2">Obligatorio</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-portal-border">
                  {campos.map((campo, index) => (
                    <tr key={campo.id} className="hover:bg-navy-medium/30">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1 text-slate-300">
                          <button
                            type="button"
                            onClick={() => moveCampo(index, -1)}
                            disabled={index === 0}
                            aria-label={`Mover ${campo.campo_etiqueta} hacia arriba`}
                            className="rounded p-0.5 transition hover:text-turquoise disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_upward</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCampo(index, 1)}
                            disabled={index === campos.length - 1}
                            aria-label={`Mover ${campo.campo_etiqueta} hacia abajo`}
                            className="rounded p-0.5 transition hover:text-turquoise disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">arrow_downward</span>
                          </button>
                          {campo.orden}
                        </div>
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-100">{campo.campo_etiqueta}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-400">{campo.campo_nombre}</td>
                      <td className="px-4 py-2">
                        <FormularioTipoCampoBadge tipo={campo.campo_tipo} />
                      </td>
                      <td className="px-4 py-2">
                        {campo.campo_obligatorio ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-900/30 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/40">
                            Obligatorio
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Opcional</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(campo)}
                            className="rounded-lg border border-portal-border bg-navy-medium px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:text-turquoise"
                          >
                            Editar
                          </button>
                          {deleteConfirmId === campo.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void confirmDelete(campo.id)}
                                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="rounded-lg border border-portal-border px-2.5 py-1 text-xs font-semibold text-slate-300"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(campo.id)}
                              className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
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

          {successMessage && !error ? <p className="mt-2 text-xs text-emerald-300">{successMessage}</p> : null}

          {error && campos.length > 0 ? (
            <div className="mt-2 rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
              {error}
            </div>
          ) : null}
        </div>
      </td>

      {modalOpen
        ? createPortal(
            <FormularioCampoFormModal
              open={modalOpen}
              mode={modalMode}
              editingCampo={editTarget}
              defaultOrden={campos.length}
              submitError={submitError}
              onClose={() => setModalOpen(false)}
              onSubmit={handleSubmit}
            />,
            document.body,
          )
        : null}
    </tr>
  );
}
