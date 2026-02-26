'use client';

import { useDisciplines } from '@/hooks/portal/disciplines/useDisciplines';
import { DisciplineFormModal } from './DisciplineFormModal';
import { DisciplinesHeaderFilters } from './DisciplinesHeaderFilters';
import { DisciplinesTable } from './DisciplinesTable';

type DisciplinesPageProps = {
  tenantId: string;
};

function LoadingState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
      Cargando disciplinas...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-lg border border-portal-border p-6 text-sm text-slate-300">
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
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Sports Disciplines</h1>
        <p className="mt-2 text-sm text-slate-400">
          Configure and manage athletic training categories for your organization.
        </p>
      </header>

      <DisciplinesHeaderFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onCreateDiscipline={openCreateModal}
      />

      {successMessage ? (
        <div className="rounded-lg border border-emerald-400/40 bg-emerald-900/20 px-4 py-3 text-sm text-emerald-200" role="status">
          {successMessage}
        </div>
      ) : null}

      {submitError && !modalOpen ? (
        <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
          {submitError}
        </div>
      ) : null}

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <div className="glass rounded-lg border border-rose-400/25 bg-rose-900/20 p-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button
            type="button"
            className="mt-4 rounded-lg border border-rose-300/30 px-3 py-2 text-xs font-semibold text-rose-100"
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