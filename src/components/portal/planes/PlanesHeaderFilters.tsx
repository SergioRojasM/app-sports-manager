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
    <div className="glass rounded-lg border border-portal-border p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block md:max-w-xl md:flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-turquoise">
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              search
            </span>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar planes por nombre o disciplina..."
            className="w-full rounded-xl border border-portal-border bg-navy-deep px-4 py-3 pl-11 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/25"
          />
        </label>

        <button
          type="button"
          onClick={onCreatePlan}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-turquoise px-4 py-2.5 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            add
          </span>
          New Plan
        </button>
      </div>
    </div>
  );
}
