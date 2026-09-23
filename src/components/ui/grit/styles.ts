/** Joins truthy class names — the kit's only class-composition helper. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Text input styling from the design's Date Picker / Search field (US-0116). */
export const gritInputClass =
  'w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3.5 py-2.5 font-grit-body text-sm text-grit-text placeholder:text-grit-muted outline-none transition focus:border-grit-cyan focus:ring-1 focus:ring-grit-cyan disabled:cursor-not-allowed disabled:opacity-60';

/** Native <select> styling, same box as gritInputClass. */
export const gritSelectClass = `${gritInputClass} appearance-none pr-9`;

/** Shared keyboard focus ring for interactive kit elements. */
export const gritFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-grit-bg';
