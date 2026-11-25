/**
 * Pure helpers for the v3 trainings calendar (`gestion-entrenamientos`, frame `p5Ms22`, US-0142).
 *
 * Dates are Bogotá calendar days handled as `YYYY-MM-DD` keys with UTC arithmetic, so the
 * browser's time zone never leaks in. Times of day are minutes since Bogotá midnight.
 */
import { bogotaDayKey } from '@/lib/portal/inicio-agenda';
import type {
  DiaSemana,
  DisciplinaTono,
  EntrenamientoAgendaEstado,
  EntrenamientosKpis,
  FilaHoraria,
  SelectOption,
  TrainingInstance,
} from '@/types/portal/entrenamientos.types';

const TIME_ZONE = 'America/Bogota';
const DOW = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const DOW_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
const MESES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/* ── Day keys ── */

function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateToKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function hoyKey(now: Date = new Date()): string {
  return bogotaDayKey(now);
}

export function addDaysKey(key: string, days: number): string {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToKey(date);
}

/** Same day-of-month clamped is not needed: the month anchor is always normalized to the 1st. */
export function addMonthsKey(key: string, months: number): string {
  const date = keyToDate(key);
  return dateToKey(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

export function startOfMonthKey(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

/** Monday of the week that contains `key`. */
export function startOfWeekKey(key: string): string {
  const mondayOffset = (keyToDate(key).getUTCDay() + 6) % 7;
  return addDaysKey(key, -mondayOffset);
}

export function isKeyInRange(key: string, from: string, to: string): boolean {
  return key >= from && key <= to;
}

/** "Viernes 20 de noviembre". */
export function formatDiaLargo(key: string): string {
  const date = keyToDate(key);
  return `${DOW_LARGO[date.getUTCDay()]} ${date.getUTCDate()} de ${MESES_LARGO[date.getUTCMonth()]}`;
}

/** "Viernes 20 nov" (day filter chip). */
export function formatDiaCorto(key: string): string {
  const date = keyToDate(key);
  return `${DOW_LARGO[date.getUTCDay()]} ${date.getUTCDate()} ${MESES[date.getUTCMonth()]}`;
}

/** "20 de noviembre" (month cell labels). */
export function formatDiaMes(key: string): string {
  const date = keyToDate(key);
  return `${date.getUTCDate()} de ${MESES_LARGO[date.getUTCMonth()]}`;
}

export function getDow(key: string): string {
  return DOW[keyToDate(key).getUTCDay()];
}

/** The 7 days of the week starting on Monday `fromKey`. */
export function buildSemana(fromKey: string, todayKey: string): DiaSemana[] {
  return Array.from({ length: 7 }, (_, index) => {
    const key = addDaysKey(fromKey, index);
    const date = keyToDate(key);
    return {
      key,
      dow: DOW[date.getUTCDay()],
      dia: date.getUTCDate(),
      nombreLargo: formatDiaLargo(key),
      esHoy: key === todayKey,
    };
  });
}

/** "16 – 22 nov 2026", "28 nov – 4 dic 2026", "29 dic 2026 – 4 ene 2027". */
export function formatSemanaLabel(fromKey: string, toKey: string): string {
  const [y1, m1, d1] = fromKey.split('-').map(Number);
  const [y2, m2, d2] = toKey.split('-').map(Number);
  if (y1 !== y2) return `${d1} ${MESES[m1 - 1]} ${y1} – ${d2} ${MESES[m2 - 1]} ${y2}`;
  if (m1 !== m2) return `${d1} ${MESES[m1 - 1]} – ${d2} ${MESES[m2 - 1]} ${y2}`;
  return `${d1} – ${d2} ${MESES[m2 - 1]} ${y2}`;
}

/** "Noviembre 2026". */
export function formatMesLabel(monthStartKey: string): string {
  const [y, m] = monthStartKey.split('-').map(Number);
  const mes = MESES_LARGO[m - 1];
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`;
}

/* ── Times ── */

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const hora12Formatter = new Intl.DateTimeFormat('es-CO', {
  timeZone: TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Minutes since Bogotá midnight of an instant. */
export function bogotaMinutosDelDia(iso: string): number {
  const parts = partsFormatter.formatToParts(new Date(iso));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0) % 24;
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/** 24-hour "6:30" / "18:00" (Bogotá). */
export function formatHoraCorta(iso: string): string {
  const minutos = bogotaMinutosDelDia(iso);
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;
}

/** "6:30 a. m." (Bogotá), for labels read aloud. */
export function formatHora12(iso: string): string {
  return hora12Formatter.format(new Date(iso));
}

/** Hour gutter label: "5 am", "12 pm", "8 pm". */
export function formatHoraEtiqueta(hora: number): string {
  const h = hora % 24;
  const sufijo = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${sufijo}`;
}

/* ── Week grid geometry ── */

/** Height of one hour row (frame `CBZLO`: 64px between hour lines). */
export const HORA_PX = 64;
/** Height of a collapsed run of empty hours (frame `e6mfu`). */
export const BANDA_PX = 30;
/** Vertical gap left between consecutive blocks. */
export const BLOQUE_GAP_PX = 4;
export const BLOQUE_MIN_MINUTOS = 30;
export const DURACION_DEFAULT_MINUTOS = 60;
export const HORA_MIN_DEFAULT = 5;
export const HORA_MAX_DEFAULT = 21;
export const MIN_HORAS_BANDA = 3;

/** A session as a time span of its Bogotá day. */
export type SpanDia = { id: string; inicio: number; fin: number };

export function spanDeInstancia(instance: TrainingInstance): SpanDia | null {
  if (!instance.fecha_hora) return null;
  const inicio = bogotaMinutosDelDia(instance.fecha_hora);
  const duracion = instance.duracion_minutos && instance.duracion_minutos > 0 ? instance.duracion_minutos : DURACION_DEFAULT_MINUTOS;
  return { id: instance.id, inicio, fin: Math.min(inicio + duracion, 24 * 60) };
}

export type GrillaHoraria = {
  filas: FilaHoraria[];
  altoTotal: number;
  /** First hour shown. */
  horaInicio: number;
  /** Pixel offset of a time of day (minutes) from the top of the grid body. */
  offsetPx: (minutos: number) => number;
};

/**
 * Hour rows of the week grid. The range covers at least 5 am – 9 pm and grows to fit any
 * session. Every run of ≥ 3 hours that no session of the week touches collapses into a
 * band (id `desde-hasta`) unless that id is in `expandidas`; a week without sessions has no bands.
 */
export function buildGrillaHoraria(spans: SpanDia[], expandidas: ReadonlySet<string>): GrillaHoraria {
  const minInicio = spans.reduce((min, span) => Math.min(min, span.inicio), Infinity);
  const maxFin = spans.reduce((max, span) => Math.max(max, span.fin), -Infinity);
  const horaInicio = Math.min(HORA_MIN_DEFAULT, Number.isFinite(minInicio) ? Math.floor(minInicio / 60) : HORA_MIN_DEFAULT);
  const horaFin = Math.min(24, Math.max(HORA_MAX_DEFAULT, Number.isFinite(maxFin) ? Math.ceil(maxFin / 60) : HORA_MAX_DEFAULT));

  const ocupadas = new Set<number>();
  for (const span of spans) {
    const ultima = Math.max(Math.floor(span.inicio / 60), Math.ceil(span.fin / 60) - 1);
    for (let hora = Math.floor(span.inicio / 60); hora <= ultima; hora += 1) ocupadas.add(hora);
  }

  const filas: FilaHoraria[] = [];
  let top = 0;
  let hora = horaInicio;
  const pushHora = (value: number) => {
    filas.push({ tipo: 'hora', hora: value, top, alto: HORA_PX });
    top += HORA_PX;
  };

  while (hora < horaFin) {
    if (ocupadas.has(hora)) {
      pushHora(hora);
      hora += 1;
      continue;
    }
    let finRun = hora;
    while (finRun < horaFin && !ocupadas.has(finRun)) finRun += 1;
    const id = `${hora}-${finRun}`;
    // An empty week keeps its full grid (the empty state sits on top of it).
    if (spans.length > 0 && finRun - hora >= MIN_HORAS_BANDA && !expandidas.has(id)) {
      filas.push({ tipo: 'banda', id, desde: hora, hasta: finRun, top, alto: BANDA_PX });
      top += BANDA_PX;
    } else {
      for (let value = hora; value < finRun; value += 1) pushHora(value);
    }
    hora = finRun;
  }

  const offsetPx = (minutos: number) => {
    const horaDe = Math.floor(minutos / 60);
    const fila = filas.find((item) =>
      item.tipo === 'hora' ? item.hora === horaDe : horaDe >= item.desde && horaDe < item.hasta,
    );
    if (!fila) return minutos < horaInicio * 60 ? 0 : top;
    if (fila.tipo === 'banda') return fila.top;
    return fila.top + ((minutos - fila.hora * 60) / 60) * HORA_PX;
  };

  return { filas, altoTotal: top, horaInicio, offsetPx };
}

/** Id of a band, e.g. bands collapsed by default; used to label its toggle. */
export function formatBandaLabel(desde: number, hasta: number): string {
  return `Mostrar ${formatHoraEtiqueta(desde)} – ${formatHoraEtiqueta(hasta - 1)}`;
}

/** Height of a block that lasts `inicio`–`fin` minutes. */
export function alturaBloquePx(grilla: GrillaHoraria, span: SpanDia): number {
  const fin = Math.max(span.fin, span.inicio + BLOQUE_MIN_MINUTOS);
  const alto = grilla.offsetPx(fin) - grilla.offsetPx(span.inicio);
  return Math.max(alto - BLOQUE_GAP_PX, (BLOQUE_MIN_MINUTOS / 60) * HORA_PX - BLOQUE_GAP_PX);
}

export type Carril = { carril: number; totalCarriles: number };

/** Side-by-side lanes for the sessions of one day: greedy assignment per cluster of overlapping sessions. */
export function asignarCarriles(spans: SpanDia[]): Map<string, Carril> {
  const ordenados = [...spans].sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);
  const resultado = new Map<string, Carril>();

  let cluster: Array<{ id: string; carril: number }> = [];
  let finesCarril: number[] = [];
  let finCluster = -Infinity;

  const cerrarCluster = () => {
    for (const item of cluster) resultado.set(item.id, { carril: item.carril, totalCarriles: finesCarril.length });
    cluster = [];
    finesCarril = [];
  };

  for (const span of ordenados) {
    if (span.inicio >= finCluster) {
      cerrarCluster();
      finCluster = -Infinity;
    }
    let carril = finesCarril.findIndex((fin) => fin <= span.inicio);
    if (carril === -1) {
      carril = finesCarril.length;
      finesCarril.push(span.fin);
    } else {
      finesCarril[carril] = span.fin;
    }
    cluster.push({ id: span.id, carril });
    finCluster = Math.max(finCluster, span.fin);
  }
  cerrarCluster();

  return resultado;
}

/* ── Discipline tones ── */

const PALETA: DisciplinaTono[] = ['accent', 'violet', 'warning', 'danger', 'success', 'teal'];

/** Tone per discipline id, from its position in the tenant's options sorted by name. */
export function buildTonosPorDisciplina(disciplinas: SelectOption[]): Record<string, DisciplinaTono> {
  return [...disciplinas]
    .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    .reduce<Record<string, DisciplinaTono>>((acc, disciplina, index) => {
      acc[disciplina.id] = PALETA[index % PALETA.length];
      return acc;
    }, {});
}

export function getDisciplinaTono(tonos: Record<string, DisciplinaTono>, disciplinaId: string | null | undefined): DisciplinaTono {
  return (disciplinaId && tonos[disciplinaId]) || 'accent';
}

/** Class strings per tone. Written in full so Tailwind's scanner sees them. */
export const TONO_CLASES: Record<
  DisciplinaTono,
  { bloque: string; borde: string; barra: string; texto: string; pill: string }
> = {
  accent: {
    bloque: 'bg-gradient-to-b from-grit-cyan/[0.22] to-grit-cyan/[0.08]',
    borde: 'border-grit-cyan/35',
    barra: 'bg-grit-cyan',
    texto: 'text-grit-cyan',
    pill: 'bg-grit-cyan/[0.14] hover:bg-grit-cyan/[0.22]',
  },
  violet: {
    bloque: 'bg-gradient-to-b from-grit-violet/[0.22] to-grit-violet/[0.08]',
    borde: 'border-grit-violet/35',
    barra: 'bg-grit-violet',
    texto: 'text-grit-violet',
    pill: 'bg-grit-violet/[0.14] hover:bg-grit-violet/[0.22]',
  },
  warning: {
    bloque: 'bg-gradient-to-b from-grit-warning/[0.22] to-grit-warning/[0.08]',
    borde: 'border-grit-warning/35',
    barra: 'bg-grit-warning',
    texto: 'text-grit-warning',
    pill: 'bg-grit-warning/[0.14] hover:bg-grit-warning/[0.22]',
  },
  danger: {
    bloque: 'bg-gradient-to-b from-grit-danger/[0.22] to-grit-danger/[0.08]',
    borde: 'border-grit-danger/35',
    barra: 'bg-grit-danger',
    texto: 'text-grit-danger',
    pill: 'bg-grit-danger/[0.14] hover:bg-grit-danger/[0.22]',
  },
  success: {
    bloque: 'bg-gradient-to-b from-grit-success/[0.22] to-grit-success/[0.08]',
    borde: 'border-grit-success/35',
    barra: 'bg-grit-success',
    texto: 'text-grit-success',
    pill: 'bg-grit-success/[0.14] hover:bg-grit-success/[0.22]',
  },
  teal: {
    bloque: 'bg-gradient-to-b from-grit-teal/[0.30] to-grit-teal/[0.10]',
    borde: 'border-grit-teal/45',
    barra: 'bg-grit-teal',
    texto: 'text-grit-teal',
    pill: 'bg-grit-teal/[0.18] hover:bg-grit-teal/[0.28]',
  },
};

/** Neutral look for cancelled sessions. */
export const TONO_CANCELADO = {
  bloque: 'bg-white/[0.03]',
  borde: 'border-white/[0.08]',
  barra: 'bg-grit-muted',
  texto: 'text-grit-muted',
  pill: 'bg-white/[0.04] hover:bg-white/[0.08]',
};

/* ── Session state ── */

export function esCancelado(instance: TrainingInstance): boolean {
  return instance.estado === 'cancelado';
}

export function esLleno(instance: TrainingInstance): boolean {
  return instance.cupo_maximo != null && (instance.reservas_activas ?? 0) >= instance.cupo_maximo;
}

export function haIniciado(instance: TrainingInstance, now: number): boolean {
  return instance.fecha_hora ? new Date(instance.fecha_hora).getTime() < now : false;
}

export function haTerminado(instance: TrainingInstance, now: number): boolean {
  if (!instance.fecha_hora) return false;
  const duracion = instance.duracion_minutos && instance.duracion_minutos > 0 ? instance.duracion_minutos : DURACION_DEFAULT_MINUTOS;
  return new Date(instance.fecha_hora).getTime() + duracion * 60_000 < now;
}

/** First not-yet-started, non-cancelled session of `instances` when they are today's. */
export function findProximaId(instances: TrainingInstance[], now: number): string | null {
  const proxima = instances
    .filter((instance) => instance.fecha_hora && !esCancelado(instance) && !haIniciado(instance, now))
    .sort((a, b) => (a.fecha_hora ?? '').localeCompare(b.fecha_hora ?? ''))[0];
  return proxima?.id ?? null;
}

/** Status tag. Precedence: cancelado > finalizado > lleno > próxima. */
export function getEstadoAgenda(
  instance: TrainingInstance,
  now: number,
  proximaId: string | null,
): EntrenamientoAgendaEstado | null {
  if (esCancelado(instance)) return 'cancelado';
  if (haTerminado(instance, now)) return 'finalizado';
  if (esLleno(instance)) return 'lleno';
  if (instance.id === proximaId) return 'proxima';
  return null;
}

export const ESTADO_AGENDA_TAG: Record<
  EntrenamientoAgendaEstado,
  { label: string; tone: 'accent' | 'warning' | 'danger' | 'neutral' }
> = {
  proxima: { label: 'Próxima', tone: 'accent' },
  lleno: { label: 'Lleno', tone: 'warning' },
  cancelado: { label: 'Cancelado', tone: 'danger' },
  finalizado: { label: 'Finalizado', tone: 'neutral' },
};

/** "18/24", or "18" when the session has no cupo. */
export function formatCupo(instance: TrainingInstance): string {
  const reservas = instance.reservas_activas ?? 0;
  return instance.cupo_maximo != null ? `${reservas}/${instance.cupo_maximo}` : `${reservas}`;
}

/** "18 de 24 reservas" / "18 reservas", for labels read aloud. */
export function formatCupoLargo(instance: TrainingInstance): string {
  const reservas = instance.reservas_activas ?? 0;
  return instance.cupo_maximo != null ? `${reservas} de ${instance.cupo_maximo} reservas` : `${reservas} reservas`;
}

/** 0–100 occupancy of a session, or null without cupo. */
export function porcentajeCupo(instance: TrainingInstance): number | null {
  if (instance.cupo_maximo == null || instance.cupo_maximo <= 0) return null;
  return Math.min(100, Math.round(((instance.reservas_activas ?? 0) / instance.cupo_maximo) * 100));
}

/** "Camilo Hernández" → "Camilo H."; one word stays as is. */
export function nombreCorto(nombre: string | null | undefined): string | null {
  if (!nombre) return null;
  const partes = nombre.trim().split(/\s+/);
  if (partes.length < 2) return partes[0] ?? null;
  return `${partes[0]} ${partes[partes.length - 1].charAt(0).toUpperCase()}.`;
}

/* ── KPIs ── */

/** KPI row of the visible period (non-cancelled sessions only). */
export function calcularKpis(instances: TrainingInstance[]): EntrenamientosKpis {
  const activas = instances.filter((instance) => !esCancelado(instance));
  const conCupo = activas.filter((instance) => instance.cupo_maximo != null && instance.cupo_maximo > 0);
  const reservas = activas.reduce((total, instance) => total + (instance.reservas_activas ?? 0), 0);
  const reservasConCupo = conCupo.reduce((total, instance) => total + (instance.reservas_activas ?? 0), 0);
  const cupos = conCupo.reduce((total, instance) => total + (instance.cupo_maximo ?? 0), 0);

  return {
    sesiones: activas.length,
    disciplinas: new Set(activas.map((instance) => instance.disciplina_id)).size,
    reservas,
    sesionesLlenas: activas.filter(esLleno).length,
    ocupacionPct: cupos > 0 ? Math.round((reservasConCupo / cupos) * 100) : null,
    cupos,
    entrenadores: new Set(activas.map((instance) => instance.entrenador_id).filter(Boolean)).size,
  };
}

/** Bogotá day key of a session, or null without date. */
export function diaDeInstancia(instance: TrainingInstance): string | null {
  return instance.fecha_hora ? bogotaDayKey(new Date(instance.fecha_hora)) : null;
}
