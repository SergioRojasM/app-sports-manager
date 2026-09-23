'use client';

import { useDisciplines } from '@/hooks/portal/disciplines/useDisciplines';
import { DisciplineFormModal } from './DisciplineFormModal';
import { DisciplinesHeaderFilters } from './DisciplinesHeaderFilters';
import { DisciplinesTable } from './DisciplinesTable';
import { GritPageHeader } from '@/components/ui';

type DisciplinesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      Cargando disciplinas...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-6 text-sm text-grit-subtext">
      No hay disciplinas registradas para esta organización.
    </div>
  );
}

export function DisciplinesPage({ tenantId }: DisciplinesPageProps) {
  const {
    loading,
    error,
    filteredDisciplines,
    searchTerm,
    setSearchTerm,
    modalOpen,
    modalMode,
    formValues,
    fieldErrors,
    submitError,
    successMessage,
    isSubmitting,
    openCreateModal,
    openEditModal,
    deleteDiscipline,
    closeModal,
    updateField,
    submit,
    refresh,
  } = useDisciplines({ tenantId });

  return (
    <section className="space-y-6">
      <GritPageHeader title="Sports Disciplines" subtitle="Configure and manage athletic training categories for your organization." />

      <DisciplinesHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateDiscipline={openCreateModal}
      />

      {successMessage ? (
        <div className="rounded-grit-md border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !modalOpen ? (
        <div className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
          {submitError}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
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

      {!loading && !error && filteredDisciplines.length === 0 ? <EmptyState /> : null}

      {!loading && !error && filteredDisciplines.length > 0 ? (
        <DisciplinesTable
          rows={filteredDisciplines}
          tenantId={tenantId}
          onEdit={openEditModal}
          onDelete={(discipline) => void deleteDiscipline(discipline)}
        />
      ) : null}

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
    </section>
  );
}