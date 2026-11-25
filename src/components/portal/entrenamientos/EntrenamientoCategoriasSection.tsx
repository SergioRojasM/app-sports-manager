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
    <section className="space-y-3 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-grit-title text-sm font-semibold text-grit-text">Categorías por nivel</h3>
        <label className="inline-flex items-center gap-2 text-xs text-grit-text">
          <input
            type="checkbox"
            checked={categoriasForm.enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="rounded border-grit-glass-border bg-grit-bg accent-grit-cyan"
          />
          ¿Usar categorías?
        </label>
      </div>

      {categoriasForm.enabled ? (
        <div className="space-y-3">
          {activeNiveles.length === 0 ? (
            <p className="text-xs text-grit-subtext">No hay niveles activos para esta disciplina.</p>
          ) : (
            <>
              <div className="space-y-2">
                {activeNiveles
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((nivel) => (
                    <div key={nivel.id} className="flex items-center gap-3">
                      <label className="min-w-[120px] text-xs text-grit-subtext">
                        <span className="mr-1.5 inline-block rounded bg-grit-card px-1.5 py-0.5 text-[10px] font-semibold text-grit-subtext">
                          {nivel.orden}
                        </span>
                        {nivel.nombre}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={categoriasForm.items[nivel.id] ?? 0}
                        onChange={(e) => onUpdateCupos(nivel.id, Math.max(0, Number(e.target.value) || 0))}
                        className="w-24 rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-1.5 text-sm text-grit-text outline-none transition focus:border-grit-cyan focus:ring-2 focus:ring-grit-cyan/35"
                      />
                      <span className="text-xs text-grit-muted">cupos</span>
                    </div>
                  ))}
              </div>

              <div className="flex flex-wrap gap-4 rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-xs">
                <span className="text-grit-subtext">
                  Cupo máximo: <span className="font-semibold text-grit-text">{capacidadMaxima}</span>
                </span>
                <span className="text-grit-subtext">
                  Total asignado: <span className={['font-semibold', sumExceedsMax ? 'text-grit-danger' : 'text-grit-text'].join(' ')}>{totalAsignado}</span>
                </span>
                <span className="text-grit-subtext">
                  Sin categoría: <span className="font-semibold text-grit-text">{cuposSinCategoria < 0 ? 0 : cuposSinCategoria}</span>
                </span>
              </div>

              {categoriasError ? (
                <p className="text-xs font-medium text-grit-danger" role="alert">{categoriasError}</p>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-grit-subtext">Todos los cupos se gestionan de forma global sin separar por nivel.</p>
      )}
    </section>
  );
}
