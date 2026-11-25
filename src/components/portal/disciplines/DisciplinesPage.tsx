'use client';

import { useRef } from 'react';
import {
  GritAlert,
  GritButton,
  GritConfirmDialog,
  GritEmptyState,
  GritPageHeader,
  GritSearchField,
} from '@/components/ui';
import { useDisciplines } from '@/hooks/portal/disciplines/useDisciplines';
import type { Discipline } from '@/types/portal/disciplines.types';
import { DisciplineDetail } from './DisciplineDetail';
import { DisciplineFormModal } from './DisciplineFormModal';
import { DisciplinesList } from './DisciplinesList';

type DisciplinesPageProps = {
  tenantId: string;
};

/** Disciplines workspace (`fXuVP` Admin · Disciplinas): list of disciplines + detail with the level ladder. */
export function DisciplinesPage({ tenantId }: DisciplinesPageProps) {
  const {
    disciplines,
    filteredDisciplines,
    counts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    activeDiscipline,
    selectDiscipline,
    nivelesActivos,
    atletas,
    reloadConteos,
    modalOpen,
    modalMode,
    formValues,
    fieldErrors,
    submitError,
    successMessage,
    dismissSuccess,
    isSubmitting,
    openCreateModal,
    openEditModal,
    closeModal,
    updateField,
    submit,
    refresh,
    deleteTarget,
    isDeleting,
    deleteError,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useDisciplines({ tenantId });

  const detailHeadingRef = useRef<HTMLHeadingElement>(null);

  const handleSelect = (discipline: Discipline) => {
    selectDiscipline(discipline.id);
    // Stacked layout (below lg): bring the detail into view and announce it
    if (window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        detailHeadingRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        detailHeadingRef.current?.focus({ preventScroll: true });
      });
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Tus"
        titleAccent="disciplinas."
        italic
        actions={
          <>
            <GritSearchField
              aria-label="Buscar disciplina"
              placeholder="Buscar disciplina…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:w-[240px]"
            />
            <GritButton icon="add" onClick={openCreateModal}>
              Nueva disciplina
            </GritButton>
          </>
        }
      />

      {successMessage ? (
        <GritAlert tone="success" onDismiss={dismissSuccess}>
          {successMessage}
        </GritAlert>
      ) : null}

      {loading ? (
        <div role="status">
          <GritEmptyState icon="hourglass_empty" title="Cargando disciplinas…" />
        </div>
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No pudimos cargar las disciplinas"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" icon="refresh" onClick={() => void refresh()}>
              Reintentar
            </GritButton>
          }
        />
      ) : disciplines.length === 0 ? (
        <GritEmptyState
          icon="sports"
          title="Aún no tienes disciplinas"
          description="Crea tu primera disciplina para organizar planes, entrenamientos y niveles."
          action={
            <GritButton icon="add" onClick={openCreateModal}>
              Nueva disciplina
            </GritButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <DisciplinesList
            disciplines={filteredDisciplines}
            counts={counts}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            activeId={activeDiscipline?.id ?? null}
            onSelect={handleSelect}
            nivelesActivos={nivelesActivos}
            atletasPorDisciplina={atletas?.porDisciplina ?? null}
            emptyContent={
              <div className="flex flex-col items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-8 text-center">
                <p className="font-grit-body text-[13px] text-grit-subtext">Ninguna disciplina coincide.</p>
                <GritButton
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('todas');
                  }}
                >
                  Limpiar filtros
                </GritButton>
              </div>
            }
          />
          {activeDiscipline ? (
            <DisciplineDetail
              ref={detailHeadingRef}
              tenantId={tenantId}
              discipline={activeDiscipline}
              nivelesActivos={nivelesActivos ? (nivelesActivos[activeDiscipline.id] ?? 0) : null}
              atletas={atletas ? (atletas.porDisciplina[activeDiscipline.id] ?? 0) : null}
              atletasPorNivel={atletas?.porNivel ?? null}
              onEdit={openEditModal}
              onDelete={requestDelete}
              onLevelsChanged={() => void reloadConteos()}
            />
          ) : (
            <GritEmptyState icon="search_off" title="Sin disciplina seleccionada" description="Ajusta la búsqueda o el filtro." />
          )}
        </div>
      )}

      <DisciplineFormModal
        open={modalOpen}
        mode={modalMode}
        isSubmitting={isSubmitting}
        values={formValues}
        fieldErrors={fieldErrors}
        submitError={submitError}
        onClose={closeModal}
        onSubmit={submit}
        onChangeField={updateField}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar disciplina"
        message={
          <>
            ¿Seguro que quieres eliminar <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>? Esta
            acción no se puede deshacer.
          </>
        }
        pending={isDeleting}
        error={deleteError}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}
