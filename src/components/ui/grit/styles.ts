/** Joins truthy class names — the kit's only class-composition helper. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Text input styling. v3 draws no form field, so this is DERIVED from the v3 control
 * language (white 4% fill, white 12% stroke, 13px) with a 12px radius — multi-field
 * forms read poorly as pills. Search inputs use GritSearchField instead (US-0141).
 */
const GRIT_INPUT_BASE =
  'w-full rounded-grit-lg border bg-white/[0.04] px-4 py-2.5 font-grit-body text-[13px] text-grit-text placeholder:text-grit-muted outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60';

export const gritInputClass = `${GRIT_INPUT_BASE} border-white/[0.12] focus:border-grit-cyan/60 focus:ring-grit-cyan/20`;

/**
 * Same box with the danger stroke, for a field with a validation error. A full class string (not an
 * override) because two utilities for the same property resolve by stylesheet order in Tailwind v4.
 */
export const gritInputInvalidClass = `${GRIT_INPUT_BASE} border-grit-danger/70 focus:border-grit-danger/70 focus:ring-grit-danger/20`;

/** Native <select> styling, same box as gritInputClass. */
export const gritSelectClass = `${gritInputClass} appearance-none pr-9`;

/** gritSelectClass with the danger stroke. */
export const gritSelectInvalidClass = `${gritInputInvalidClass} appearance-none pr-9`;

/** File <input> in a form: same box, with a cyan-tinted "choose file" button. */
export const gritFileInputClass = `${gritInputClass} file:mr-3 file:rounded-full file:border-0 file:bg-grit-cyan/15 file:px-3 file:py-1 file:font-grit-body file:text-xs file:font-semibold file:text-grit-cyan`;

/**
 * Compact pill <select> for toolbars, from v3 Dropdown Filter (`XSFT7`). Draws its own
 * chevron (`.grit-select-chevron` in globals.css) because `appearance-none` removes the native arrow.
 */
export const gritPillSelectClass =
  'grit-select-chevron h-[35px] appearance-none rounded-full border border-white/[0.12] bg-white/[0.04] pl-3.5 pr-8 font-grit-body text-xs font-semibold text-grit-text outline-none transition hover:bg-white/[0.08] focus:border-grit-cyan/60 focus:ring-2 focus:ring-grit-cyan/20 disabled:cursor-not-allowed disabled:opacity-60';

/** Shared keyboard focus ring for interactive kit elements. */
export const gritFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan/70 focus-visible:ring-offset-2 focus-visible:ring-offset-grit-bg';

/* v3 Table / Head + Table / Row (`v3ijUr`, `jpBWr`). The <table> sits in
   `GritCard variant="card" padding="none" className="overflow-hidden"`. */

/** <thead> row: faint white fill. */
export const gritTableHeadClass = 'bg-white/[0.02]';

/** <th>: 10px uppercase muted label with 1.3px tracking. */
export const gritTableHeadCellClass =
  'px-[22px] py-[13px] text-left font-grit-body text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted';

/** <tbody> <tr>: neutral hairline on top and a faint hover. */
export const gritTableRowClass = 'border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]';

/** <td>: 13px primary text. Secondary columns add `text-grit-subtext`. */
export const gritTableCellClass = 'px-[22px] py-4 font-grit-body text-[13px] text-grit-text';

/** Compact <th> / <td> (14px side padding) for tables with 8+ columns that must fit 1120px without scrolling. */
export const gritTableHeadCellCompactClass =
  'px-3.5 py-[13px] text-left font-grit-body text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted';

export const gritTableCellCompactClass = 'px-3.5 py-3.5 font-grit-body text-[13px] text-grit-text';
