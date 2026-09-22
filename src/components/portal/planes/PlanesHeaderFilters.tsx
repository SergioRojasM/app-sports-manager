type PlanesHeaderFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCreatePlan: () => void;
};

export function PlanesHeaderFilters({
  searchTerm,
  onSearchChange,
  onCreatePlan,
}: PlanesHeaderFiltersProps) {
  return (
    <div className="border bg-grit-glass backdrop-blur-md rounded-grit-2xl border-grit-glass-border p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:max-w-xl md:flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-grit-cyan">
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              search
            </span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar planes por nombre o disciplina..."
            className="w-full rounded-grit-lg border border-grit-glass-border bg-grit-bg px-4 py-3 pl-11 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/25"
          />
        </label>

        <button
          type="button"
          onClick={onCreatePlan}
          className="inline-flex items-center justify-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2.5 text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan/90"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            add
          </span>
          Nuevo Plan
        </button>
      </div>
    </div>
  );
}
