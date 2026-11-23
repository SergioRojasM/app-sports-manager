/** Joins truthy class names — the kit's only class-composition helper. */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Text input styling. v3 draws no form field, so this is DERIVED from the v3 control
 * language (white 4% fill, white 12% stroke, 13px) with a 12px radius — multi-field
 * forms read poorly as pills. Search inputs use GritSearchField instead (US-0141).
 */
export const gritInputClass =
  'w-full rounded-grit-lg border border-white/[0.12] bg-white/[0.04] px-4 py-2.5 font-grit-body text-[13px] text-grit-text placeholder:text-grit-muted outline-none transition focus:border-grit-cyan/60 focus:ring-2 focus:ring-grit-cyan/20 disabled:cursor-not-allowed disabled:opacity-60';

/** Native <select> styling, same box as gritInputClass. */
export const gritSelectClass = `${gritInputClass} appearance-none pr-9`;

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
