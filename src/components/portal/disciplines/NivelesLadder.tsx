'use client';

import { useState } from 'react';
import {
  GritAddTile,
  GritAlert,
  GritButton,
  GritConfirmDialog,
  GritIcon,
  GritIconButton,
  GritSectionHeading,
  GritTag,
  cx,
} from '@/components/ui';
import { useNivelesDisciplina } from '@/hooks/portal/nivel-disciplina/useNivelesDisciplina';
import {
  distribucionNiveles,
  formatAtletas,
  formatPosicion,
  siguienteOrden,
} from '@/lib/portal/admin-catalogo.utils';
import type { NivelDisciplina } from '@/types/portal/nivel-disciplina.types';
import { NivelDisciplinaFormModal } from './NivelDisciplinaFormModal';

type NivelesLadderProps = {
  tenantId: string;
  disciplinaId: string;
  /** Athletes per level id; null when the count failed ("—" and no bar). */
  atletasPorNivel: Record<string, number> | null;
  /** After a mutation (counts of the list may change). */
  onChanged: () => void;
};

/** Ascending tile heights of the frame (210 / 250 / 290…), capped at five steps. */
const STEP_HEIGHTS = [
  'min-h-[190px] md:min-h-[210px]',
  'min-h-[190px] md:min-h-[250px]',
  'min-h-[190px] md:min-h-[290px]',
  'min-h-[190px] md:min-h-[330px]',
  'min-h-[190px] md:min-h-[370px]',
];

/** Segment tints, from the first level (dimmer) to the last (brighter). */
const SEGMENT_TONES = ['bg-grit-cyan/45', 'bg-grit-cyan/70', 'bg-grit-cyan', 'bg-grit-cyan-light', 'bg-grit-cyan-light'];

/** "Niveles de progresión" section of the discipline detail (`fXuVP` `lxevr` + `f27Zh1` + `ngPAB`). */
export function NivelesLadder({ tenantId, disciplinaId, atletasPorNivel, onChanged }: NivelesLadderProps) {
  const { niveles, loading, error, successMessage, movingId, loadNiveles, createNivel, updateNivel, deleteNivel, moveNivel, clearMessages } =
    useNivelesDisciplina({ tenantId, disciplinaId, onChanged });

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; target: NivelDisciplina | null } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NivelDisciplina | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = [...niveles].sort((a, b) => a.orden - b.orden);
  const nextOrden = siguienteOrden(sorted);
  const distribucion = atletasPorNivel ? distribucionNiveles(sorted, atletasPorNivel) : null;

  const openCreate = () => {
    clearMessages();
    setSubmitError(null);
    setModal({ mode: 'create', target: null });
  };
  const openEdit = (nivel: NivelDisciplina) => {
    clearMessages();
    setSubmitError(null);
    setModal({ mode: 'edit', target: nivel });
  };

  const withSubmit =
    <A extends unknown[]>(action: (...args: A) => Promise<boolean>, fallback: string) =>
    async (...args: A) => {
      setIsSubmitting(true);
      setSubmitError(null);
      const ok = await action(...args);
      setIsSubmitting(false);
      if (!ok) setSubmitError(fallback);
      return ok;
    };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    const ok = await deleteNivel(deleteTarget.id);
    setIsDeleting(false);
    if (ok) setDeleteTarget(null);
  };

  const move = async (nivel: NivelDisciplina, direction: 'antes' | 'despues') => {
    await moveNivel(nivel.id, direction);
    // Keep focus on a control of the moved level (by id: the tile re-renders at its new position)
    requestAnimationFrame(() => {
      const tile = document.getElementById(`nivel-${nivel.id}`);
      const preferred = tile?.querySelector<HTMLElement>(`[data-move="${direction}"]`);
      (preferred ?? tile?.querySelector<HTMLElement>('[data-move]'))?.focus();
    });
  };

  return (
    <section aria-labelledby={`niveles-${disciplinaId}`} className="flex flex-col gap-4">
      <GritSectionHeading
        id={`niveles-${disciplinaId}`}
        as="h3"
        size="md"
        title="Niveles de progresión"
        subtitle="Ordena los niveles con las flechas; los atletas ascienden en ese orden."
        action={
          <GritButton size="sm" variant="outline-accent" icon="add" onClick={openCreate}>
            Agregar nivel
          </GritButton>
        }
      />

      {error && !deleteTarget && !modal ? (
        <GritAlert tone="danger" onDismiss={clearMessages} action={niveles.length === 0 ? (
          <GritButton size="sm" variant="secondary" onClick={() => void loadNiveles()}>Reintentar</GritButton>
        ) : undefined}>
          {error}
        </GritAlert>
      ) : null}
      {successMessage && !error ? (
        <p role="status" className="sr-only">
          {successMessage}
        </p>
      ) : null}

      {loading ? (
        <p role="status" className="font-grit-body text-[13px] text-grit-subtext">
          Cargando niveles…
        </p>
      ) : sorted.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-8 text-center">
          <p className="font-grit-body text-[13px] text-grit-subtext">Esta disciplina aún no tiene niveles.</p>
          <GritButton size="sm" icon="add" onClick={openCreate}>
            Agregar nivel
          </GritButton>
        </div>
      ) : sorted.length > 0 ? (
        <>
          {distribucion && distribucion.total > 0 ? (
            <div role="img" aria-label={`Atletas por nivel: ${distribucion.texto}`} className="flex h-2 w-full gap-1">
              {distribucion.segmentos
                .filter((segmento) => segmento.count > 0)
                .map((segmento) => {
                  const index = sorted.findIndex((n) => n.id === segmento.id);
                  return (
                    <span
                      key={segmento.id}
                      className={cx('h-2 rounded-full', SEGMENT_TONES[Math.min(index, SEGMENT_TONES.length - 1)])}
                      style={{ width: `${segmento.pct}%` }}
                    />
                  );
                })}
            </div>
          ) : distribucion ? (
            <div aria-hidden className="h-2 w-full rounded-full bg-white/[0.06]" />
          ) : null}

          <ol className="grid grid-cols-2 items-end gap-3 md:grid-cols-[repeat(auto-fit,minmax(118px,1fr))]">
            {sorted.map((nivel, index) => (
              <li
                key={nivel.id}
                id={`nivel-${nivel.id}`}
                className={cx(
                  'flex flex-col gap-2 rounded-[18px] border p-4',
                  STEP_HEIGHTS[Math.min(index, STEP_HEIGHTS.length - 1)],
                  index === sorted.length - 1
                    ? 'border-grit-cyan/35 bg-gradient-to-b from-grit-cyan/[0.12] to-grit-cyan/[0.02]'
                    : 'border-white/[0.06] bg-white/[0.025]',
                )}
              >
                <div className="flex items-start justify-between gap-1">
                  <span
                    className={cx(
                      'font-grit-title text-[26px] font-light leading-none',
                      index === sorted.length - 1 ? 'text-grit-cyan' : 'text-grit-text',
                    )}
                  >
                    {formatPosicion(index)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <GritIconButton icon="edit" label={`Editar nivel ${nivel.nombre}`} size="sm" variant="ghost" onClick={() => openEdit(nivel)} />
                    <GritIconButton
                      icon="delete"
                      label={`Eliminar nivel ${nivel.nombre}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeleteError(null);
                        clearMessages();
                        setDeleteTarget(nivel);
                      }}
                    />
                  </span>
                </div>
                <span className="flex-1" />
                <span className="font-grit-body text-sm font-semibold text-grit-text">{nivel.nombre}</span>
                {!nivel.activo ? (
                  <GritTag tone="neutral" dot className="self-start">
                    Inactivo
                  </GritTag>
                ) : null}
                <span className="flex items-center gap-1.5 font-grit-body text-[11px] font-semibold text-grit-subtext">
                  <GritIcon name="group" size={12} className="text-grit-cyan" />
                  {formatAtletas(atletasPorNivel ? (atletasPorNivel[nivel.id] ?? 0) : null)}
                </span>
                <span className="flex items-center gap-1 border-t border-white/[0.06] pt-2">
                  {index > 0 ? (
                    <GritIconButton
                      data-move="antes"
                      icon="arrow_back"
                      label={`Mover ${nivel.nombre} antes`}
                      size="sm"
                      variant="ghost"
                      disabled={movingId !== null}
                      onClick={() => void move(nivel, 'antes')}
                    />
                  ) : null}
                  {index < sorted.length - 1 ? (
                    <GritIconButton
                      data-move="despues"
                      icon="arrow_forward"
                      label={`Mover ${nivel.nombre} después`}
                      size="sm"
                      variant="ghost"
                      disabled={movingId !== null}
                      onClick={() => void move(nivel, 'despues')}
                    />
                  ) : null}
                  <GritIcon name="drag_indicator" size={13} className="ml-auto text-grit-muted" />
                </span>
              </li>
            ))}
            <li className={cx('flex', STEP_HEIGHTS[Math.min(sorted.length, STEP_HEIGHTS.length - 1)])}>
              <GritAddTile size="sm" title={`Nivel ${formatPosicion(sorted.length)}`} onClick={openCreate} className="min-h-0" />
            </li>
          </ol>
        </>
      ) : null}

      <NivelDisciplinaFormModal
        open={modal !== null}
        mode={modal?.mode ?? 'create'}
        tenantId={tenantId}
        disciplinaId={disciplinaId}
        initial={modal?.target ?? null}
        initialOrden={nextOrden}
        isSubmitting={isSubmitting}
        submitError={modal ? (error ?? submitError) : null}
        onClose={() => setModal(null)}
        onCreate={withSubmit(createNivel, 'No fue posible crear el nivel.')}
        onUpdate={withSubmit(updateNivel, 'No fue posible actualizar el nivel.')}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar nivel"
        message={
          <>
            ¿Deseas eliminar el nivel <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>?
          </>
        }
        pending={isDeleting}
        error={deleteTarget ? (deleteError ?? error) : null}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteTarget(null);
          clearMessages();
        }}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
