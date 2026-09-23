/**
 * Discipline → icon/colour for tags and cards (US-0116).
 *
 * The design colours each discipline, but there is no DB column for it, so the
 * visual is derived from the discipline's free-text name. Matching ignores case
 * and accents; unknown names fall back to a neutral icon in the brand cyan.
 */
export type DisciplinaVisual = {
  /** Material Symbols ligature. */
  icon: string;
  /** Tailwind text-colour class. */
  colorClass: string;
};

const RULES: Array<{ pattern: RegExp; visual: DisciplinaVisual }> = [
  { pattern: /natacion|nado|swim|aguas abiertas/, visual: { icon: 'pool', colorClass: 'text-grit-discipline-swim' } },
  { pattern: /ciclismo|bici|cycl|spinning/, visual: { icon: 'directions_bike', colorClass: 'text-grit-discipline-cycle' } },
  { pattern: /running|carrera|trote|atletismo|run/, visual: { icon: 'directions_run', colorClass: 'text-grit-discipline-run' } },
  { pattern: /fuerza|gym|gimnasio|strength|pesas/, visual: { icon: 'fitness_center', colorClass: 'text-grit-discipline-strength' } },
  { pattern: /funcional|crossfit|hiit/, visual: { icon: 'sports_gymnastics', colorClass: 'text-grit-discipline-functional' } },
  { pattern: /movilidad|yoga|stretch|estiramiento|pilates/, visual: { icon: 'self_improvement', colorClass: 'text-grit-discipline-mobility' } },
];

const FALLBACK: DisciplinaVisual = { icon: 'sports', colorClass: 'text-grit-cyan' };

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

export function getDisciplinaVisual(nombre: string | null | undefined): DisciplinaVisual {
  if (!nombre) return FALLBACK;
  const normalized = normalize(nombre);
  return RULES.find((rule) => rule.pattern.test(normalized))?.visual ?? FALLBACK;
}
