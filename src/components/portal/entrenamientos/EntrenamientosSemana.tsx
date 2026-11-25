'use client';

import { useMemo, useState } from 'react';
import { GritButton, GritIcon, cx, gritFocusRing } from '@/components/ui';
import {
  alturaBloquePx,
  asignarCarriles,
  buildGrillaHoraria,
  diaDeInstancia,
  formatBandaLabel,
  formatHoraEtiqueta,
  getDisciplinaTono,
  haIniciado,
  spanDeInstancia,
  type SpanDia,
} from '@/lib/portal/entrenamientos-calendario';
import { EntrenamientoBloque } from './EntrenamientoBloque';
import type { DiaSemana, DisciplinaTono, TrainingCalendarItem } from '@/types/portal/entrenamientos.types';

type EntrenamientosSemanaProps = {
  dias: DiaSemana[];
  items: TrainingCalendarItem[];
  tonos: Record<string, DisciplinaTono>;
  selectedDateKey: string | null;
  now: number;
  loading: boolean;
  canManage: boolean;
  onSelectDate: (dateKey: string) => void;
  onOpenTraining: (trainingId: string) => void;
  onCrear: () => void;
};

const GRID_COLS = 'grid grid-cols-[44px_repeat(7,minmax(0,1fr))] gap-x-1.5 sm:gap-x-2';
/** Breathing room above the first hour line so its label isn't clipped. */
const BODY_PAD_TOP = 8;

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Week time grid (grit-arena-v3 `p5Ms22` `A5VHvt`): day tiles, an hour gutter with collapsible empty
 * runs, and one column per day with the sessions placed by start time and sized by duration.
 * Mount it with `key={weekStart}` so expanded bands reset when the week changes.
 */
export function EntrenamientosSemana({
  dias,
  items,
  tonos,
  selectedDateKey,
  now,
  loading,
  canManage,
  onSelectDate,
  onOpenTraining,
  onCrear,
}: EntrenamientosSemanaProps) {
  const [expandidas, setExpandidas] = useState<ReadonlySet<string>>(() => new Set());

  const porDia = useMemo(() => {
    const map = new Map<string, Array<{ item: TrainingCalendarItem; span: SpanDia }>>();
    for (const item of items) {
      const key = diaDeInstancia(item.instance);
      const span = spanDeInstancia(item.instance);
      if (!key || !span) continue;
      map.set(key, [...(map.get(key) ?? []), { item, span }]);
    }
    return map;
  }, [items]);

  const spans = useMemo(() => Array.from(porDia.values()).flat().map((entry) => entry.span), [porDia]);
  const grilla = useMemo(() => buildGrillaHoraria(spans, expandidas), [expandidas, spans]);

  // Expanded runs keep a "hide" control on their first hour row.
  const expandidasVisibles = useMemo(
    () =>
      Array.from(expandidas)
        .map((id) => {
          const [desde, hasta] = id.split('-').map(Number);
          const fila = grilla.filas.find((row) => row.tipo === 'hora' && row.hora === desde);
          return fila ? { id, desde, hasta, top: fila.top } : null;
        })
        .filter((value): value is { id: string; desde: number; hasta: number; top: number } => value !== null),
    [expandidas, grilla.filas],
  );

  const toggleBanda = (id: string) => {
    setExpandidas((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bodyHeight = grilla.altoTotal + BODY_PAD_TOP;
  const isEmpty = !loading && items.length === 0;

  return (
    <div className="grit-scrollbar -mx-1 overflow-x-auto px-1 pb-1">
      <div className="min-w-[680px]">
        {/* Day header tiles (`S6daU`) */}
        <div className={GRID_COLS}>
          <span aria-hidden className="max-md:sticky max-md:left-0 max-md:z-10 max-md:bg-grit-surface" />
          {dias.map((dia) => {
            const count = porDia.get(dia.key)?.length ?? 0;
            const selected = dia.key === selectedDateKey;
            return (
              <button
                key={dia.key}
                type="button"
                onClick={() => onSelectDate(dia.key)}
                aria-pressed={selected}
                aria-current={dia.esHoy ? 'date' : undefined}
                aria-label={`${dia.nombreLargo}, ${plural(count, 'sesión', 'sesiones')}`}
                className={cx(
                  'flex flex-col items-center gap-0.5 rounded-grit-lg border px-2 py-2 transition-colors',
                  gritFocusRing,
                  dia.esHoy
                    ? 'border-transparent bg-grit-cyan text-grit-on-brand shadow-[0_8px_20px_rgba(20,219,196,0.25)]'
                    : selected
                      ? 'border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-text'
                      : 'border-white/[0.05] bg-white/[0.02] text-grit-text hover:bg-white/[0.05]',
                  dia.esHoy && selected && 'ring-2 ring-grit-cyan/40 ring-offset-2 ring-offset-grit-surface',
                )}
              >
                <span
                  className={cx(
                    'font-grit-body text-[9px] font-bold tracking-[1px]',
                    dia.esHoy ? 'text-grit-on-brand' : 'text-grit-muted',
                  )}
                >
                  {dia.dow}
                </span>
                <span className="font-grit-title text-xl font-semibold leading-6">{dia.dia}</span>
              </button>
            );
          })}
        </div>

        {/* Week body (`CBZLO`) */}
        <div className={cx(GRID_COLS, 'relative mt-2')} aria-busy={loading || undefined}>
          {/* Hour gutter */}
          <div className="relative max-md:sticky max-md:left-0 max-md:z-10 max-md:bg-grit-surface" style={{ height: bodyHeight }}>
            {grilla.filas.map((fila) =>
              fila.tipo === 'hora' ? (
                <span
                  key={`h-${fila.hora}`}
                  aria-hidden
                  className="absolute left-0 -translate-y-1/2 font-grit-mono text-[10px] text-grit-muted"
                  style={{ top: fila.top + BODY_PAD_TOP }}
                >
                  {formatHoraEtiqueta(fila.hora)}
                </span>
              ) : (
                <button
                  key={`b-${fila.id}`}
                  type="button"
                  onClick={() => toggleBanda(fila.id)}
                  aria-expanded={false}
                  aria-label={formatBandaLabel(fila.desde, fila.hasta)}
                  title={formatBandaLabel(fila.desde, fila.hasta)}
                  className={cx(
                    'absolute inset-x-0 flex items-center justify-center rounded-[6px] bg-white/[0.03] text-grit-muted transition-colors hover:bg-white/[0.08] hover:text-grit-text',
                    gritFocusRing,
                  )}
                  style={{ top: fila.top + BODY_PAD_TOP + 4, height: fila.alto - 8 }}
                >
                  <GritIcon name="unfold_more" size={12} />
                </button>
              ),
            )}
            {expandidasVisibles.map((run) => (
              <button
                key={`x-${run.id}`}
                type="button"
                onClick={() => toggleBanda(run.id)}
                aria-expanded
                aria-label={`Ocultar ${formatHoraEtiqueta(run.desde)} – ${formatHoraEtiqueta(run.hasta - 1)}`}
                title={`Ocultar ${formatHoraEtiqueta(run.desde)} – ${formatHoraEtiqueta(run.hasta - 1)}`}
                className={cx(
                  'absolute left-0 flex h-[18px] w-[22px] items-center justify-center rounded-[6px] bg-white/[0.03] text-grit-muted transition-colors hover:bg-white/[0.08] hover:text-grit-text',
                  gritFocusRing,
                )}
                style={{ top: run.top + BODY_PAD_TOP + 10 }}
              >
                <GritIcon name="unfold_less" size={12} />
              </button>
            ))}
          </div>

          {/* Day columns */}
          {dias.map((dia) => {
            const entries = porDia.get(dia.key) ?? [];
            const carriles = asignarCarriles(entries.map((entry) => entry.span));
            return (
              <div
                key={dia.key}
                className={cx(
                  'relative rounded-grit-lg border',
                  dia.esHoy ? 'border-grit-cyan/25 bg-grit-cyan/[0.04]' : 'border-white/[0.04] bg-white/[0.015]',
                )}
                style={{ height: bodyHeight }}
              >
                {grilla.filas.map((fila) =>
                  fila.tipo === 'hora' ? (
                    <span
                      key={`l-${fila.hora}`}
                      aria-hidden
                      className="absolute inset-x-0 h-px bg-white/[0.05]"
                      style={{ top: fila.top + BODY_PAD_TOP }}
                    />
                  ) : (
                    <span
                      key={`f-${fila.id}`}
                      aria-hidden
                      className="absolute inset-x-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]"
                      style={{ top: fila.top + BODY_PAD_TOP, height: fila.alto }}
                    />
                  ),
                )}

                {!loading &&
                  entries.map(({ item, span }) => {
                    const lane = carriles.get(span.id) ?? { carril: 0, totalCarriles: 1 };
                    const anchoPct = 100 / lane.totalCarriles;
                    return (
                      <EntrenamientoBloque
                        key={item.instance.id}
                        instance={item.instance}
                        tono={getDisciplinaTono(tonos, item.instance.disciplina_id)}
                        diaLargo={dia.nombreLargo}
                        isPast={haIniciado(item.instance, now)}
                        onOpen={(trainingId) => {
                          onSelectDate(dia.key);
                          onOpenTraining(trainingId);
                        }}
                        style={{
                          top: grilla.offsetPx(span.inicio) + BODY_PAD_TOP + 2,
                          height: alturaBloquePx(grilla, span),
                          left: `calc(${lane.carril * anchoPct}% + 4px)`,
                          width: `calc(${anchoPct}% - ${lane.totalCarriles > 1 ? 6 : 8}px)`,
                        }}
                      />
                    );
                  })}
              </div>
            );
          })}

          {loading && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-grit-glass px-4 py-2 font-grit-body text-xs text-grit-subtext backdrop-blur-xl">
                <GritIcon name="progress_activity" size={16} className="animate-spin text-grit-cyan" />
                Cargando entrenamientos…
              </span>
            </div>
          )}

          {isEmpty && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-center pt-24">
              <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-grit-2xl border border-white/[0.08] bg-grit-glass px-6 py-5 text-center backdrop-blur-xl">
                <GritIcon name="event_busy" size={22} className="text-grit-muted" />
                <p className="font-grit-body text-sm text-grit-subtext">Sin entrenamientos esta semana</p>
                {canManage && (
                  <GritButton size="sm" icon="add" onClick={onCrear}>
                    Crear entrenamiento
                  </GritButton>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
