/**
 * Shared nivo theme + categorical palette for the analytics charts (US-0116 design pass).
 *
 * nivo needs plain values (it cannot consume Tailwind classes and runs during SSR),
 * so these are literals — each one mirrors a `grit-*` token so drift is visible in review.
 * Change a colour here, never inline in a chart.
 */

/**
 * Series order: brand accent first, `grit-danger` last so a red slice reads as an
 * exception. Neighbouring entries are deliberately far apart in hue — cyan and
 * teal sat next to each other in a two-slice donut and read as one colour.
 */
export const ANALITICA_CHART_COLORS = [
  '#14DBC4', // grit-cyan
  '#B98AFF', // grit-discipline-strength
  '#F2B84B', // grit-discipline-run
  '#6BCB77', // grit-discipline-mobility
  '#0FA3AB', // grit-teal
  '#FF6B6B', // grit-danger
];

const TEXT = '#BAC7D5'; // grit-subtext
const MUTED = '#8A9AAB'; // grit-muted
const LINE = 'rgba(255, 255, 255, 0.07)'; // table/grid separator used across the Portal

export const analiticaChartTheme = {
  text: { fill: MUTED, fontSize: 11 },
  axis: {
    ticks: { text: { fill: MUTED }, line: { stroke: LINE } },
    legend: { text: { fill: TEXT } },
  },
  grid: { line: { stroke: LINE } },
  legends: { text: { fill: TEXT } },
  labels: { text: { fill: TEXT, fontSize: 11, fontWeight: 600 } },
  crosshair: { line: { stroke: MUTED, strokeWidth: 1, strokeOpacity: 0.6 } },
  tooltip: {
    container: {
      background: '#0B1826', // grit-card, opaque so tooltips stay legible over charts
      color: '#E6EDF3', // grit-text
      border: '1px solid rgba(20, 219, 196, 0.25)', // grit-glass-border
      borderRadius: '10px', // rounded-grit-md
      fontSize: 12,
    },
  },
};

/** Legend item colour, kept next to the theme so charts never inline it. */
export const ANALITICA_LEGEND_TEXT_COLOR = TEXT;

/** Dark text for labels drawn on top of a bright slice or bar. */
export const ANALITICA_ON_ACCENT_TEXT_COLOR = '#07111F'; // grit-bg-navy
