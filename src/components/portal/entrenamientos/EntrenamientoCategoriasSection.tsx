import type { NivelDisciplina } from '@/types/portal/nivel-disciplina.types';
import type { CategoriasFormState } from '@/types/portal/entrenamientos.types';

type EntrenamientoCategoriasSectionProps = {
  categoriasForm: CategoriasFormState;
  activeNiveles: NivelDisciplina[];
  capacidadMaxima: number;
  totalAsignado: number;
  cuposSinCategoria: number;
  sumExceedsMax: boolean;
  categoriasError: string | null;
  onToggle: (enabled: boolean) => void;
  onUpdateCupos: (nivelId: string, cupos: number) => void;
};

export function EntrenamientoCategoriasSection({
  categoriasForm,
  activeNiveles,
  capacidadMaxima,
  totalAsignado,
  cuposSinCategoria,
  sumExceedsMax,
  categoriasError,
  onToggle,
  onUpdateCupos,
}: EntrenamientoCategoriasSectionProps) {
  return (
    <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Categorías por nivel</h3>
        <label className="inline-flex items-center gap-2 text-xs text-slate-200">
          <input
            type="checkbox"
            checked={categoriasForm.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-slate-600 bg-navy-deep accent-turquoise"
          />
          ¿Usar categorías?
        </label>
      </div>

      {categoriasForm.enabled ? (
        <div className="space-y-3">
          {activeNiveles.length === 0 ? (
            <p className="text-xs text-slate-400">No hay niveles activos para esta disciplina.</p>
          ) : (
            <>
              <div className="space-y-2">
                {activeNiveles
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((nivel) => (
                    <div key={nivel.id} className="flex items-center gap-3">
                      <label className="min-w-[120px] text-xs text-slate-300">
                        <span className="mr-1.5 inline-block rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                          {nivel.orden}
                        </span>
                        {nivel.nombre}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={categoriasForm.items[nivel.id] ?? 0}
                        onChange={(e) => onUpdateCupos(nivel.id, Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 rounded-lg border border-slate-700 bg-navy-deep px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
                      />
                      <span className="text-xs text-slate-500">cupos</span>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap gap-4 rounded-lg border border-portal-border bg-navy-medium/30 px-3 py-2 text-xs">
                <span className="text-slate-400">
                  Cupo máximo: <span className="font-semibold text-slate-200">{capacidadMaxima}</span>
                </span>
                <span className="text-slate-400">
                  Total asignado: <span className={['font-semibold', sumExceedsMax ? 'text-rose-300' : 'text-slate-200'].join(' ')}>{totalAsignado}</span>
                </span>
                <span className="text-slate-400">
                  Sin categoría: <span className="font-semibold text-slate-200">{cuposSinCategoria < 0 ? 0 : cuposSinCategoria}</span>
                </span>
              </div>

              {categoriasError ? (
                <p className="text-xs font-medium text-rose-300" role="alert">{categoriasError}</p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400">Todos los cupos se gestionan de forma global sin separar por nivel.</p>
      )}
    </section>
  );
}
