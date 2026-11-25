import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { formatHoraCorta } from '@/lib/portal/eventos-card-model';
import {
  MAX_PILLS_PER_DAY,
  dayAriaLabel,
  pillTone,
  type CalendarCell,
  type EventoPillTone,
} from '@/lib/portal/gestion-eventos-calendario';
import type { EventoListItem } from '@/types/portal/eventos.types';

type EventosCalendarDayCellProps = {
  cell: CalendarCell;
  eventos: EventoListItem[];
  isToday: boolean;
  isSelected: boolean;
  loading: boolean;
  onSelect: (dateKey: string) => void;
};

const CELL_BASE = 'flex min-h-[72px] flex-col gap-1.5 rounded-[14px] border p-1.5 text-left sm:min-h-[95px] sm:p-2';

const PILL_TONES: Record<EventoPillTone, string> = {
  // `KJWrq`: cyan gradient pill with a soft glow
  confirmado:
    'bg-gradient-to-r from-grit-cyan to-grit-cyan-light text-grit-on-brand shadow-[0_4px_12px_rgba(20,219,196,0.35)]',
  cancelado: 'border border-white/[0.08] bg-white/[0.04] text-grit-muted line-through',
  borrador: 'border border-dashed border-white/25 italic text-grit-subtext',
};

const DOT_TONES: Record<EventoPillTone, string> = {
  confirmado: 'bg-grit-cyan',
  cancelado: 'bg-grit-muted',
  borrador: 'border border-dashed border-grit-subtext',
};

function EventoPill({ evento }: { evento: EventoListItem }) {
  const tone = pillTone(evento);
  const hora = formatHoraCorta(evento.fechaHora);
  return (
    <span
      className={cx(
        'hidden min-w-0 flex-col gap-0.5 rounded-[9px] px-2 py-1.5 font-grit-body leading-tight sm:flex',
        // Inactive events (hidden from members) read as a warning whatever their estado
        evento.activo ? PILL_TONES[tone] : 'border border-grit-warning/35 bg-grit-warning/[0.08] text-grit-warning',
      )}
    >
      <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold">
        {!evento.activo && <GritIcon name="visibility_off" size={11} className="shrink-0" />}
        <span className="truncate">{evento.nombre}</span>
      </span>
      {hora && <span className="text-[9px] opacity-80">{hora}</span>}
    </span>
  );
}

/** One day of the admin events month grid (grit-arena-v3 `ZYxt2` `h7Ok29`). */
export function EventosCalendarDayCell({ cell, eventos, isToday, isSelected, loading, onSelect }: EventosCalendarDayCellProps) {
  if (!cell.inMonth) {
    return (
      <div aria-hidden="true" className={cx(CELL_BASE, 'border-white/[0.03]')}>
        <span className="font-grit-body text-[11px] font-semibold text-grit-muted/50">{cell.dayNumber}</span>
      </div>
    );
  }

  if (loading) {
    return <div aria-hidden="true" className={cx(CELL_BASE, 'animate-pulse border-white/[0.06] bg-white/[0.03]')} />;
  }

  const visible = eventos.slice(0, MAX_PILLS_PER_DAY);
  const overflow = eventos.length - visible.length;

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.dateKey)}
      aria-pressed={isSelected}
      aria-label={dayAriaLabel(cell.dateKey, eventos)}
      aria-current={isToday ? 'date' : undefined}
      className={cx(
        CELL_BASE,
        'transition-colors',
        gritFocusRing,
        isSelected
          ? 'bg-grit-cyan/[0.08]'
          : cx(cell.isWeekend ? 'bg-white/[0.016]' : 'bg-white/[0.028]', 'hover:bg-white/[0.05]'),
        // One border colour per state: today wins (ring + glow), then selected, then the hairline
        isToday
          ? 'border-grit-cyan/50 shadow-[0_0_18px_rgba(20,219,196,0.15)]'
          : isSelected
            ? 'border-grit-cyan/35'
            : 'border-white/[0.06]',
      )}
    >
      <span className={cx('font-grit-body text-[11px] font-semibold', isToday ? 'text-grit-cyan' : 'text-grit-subtext')}>
        {cell.dayNumber}
      </span>
      {visible.length > 0 && (
        <span aria-hidden="true" className="flex min-w-0 flex-col gap-1">
          {visible.map((evento) => (
            <EventoPill key={evento.id} evento={evento} />
          ))}
          {/* Below sm the pills collapse to dots */}
          <span className="flex flex-wrap gap-1 sm:hidden">
            {eventos.map((evento) => (
              <span
                key={evento.id}
                className={cx('h-1.5 w-1.5 rounded-full', evento.activo ? DOT_TONES[pillTone(evento)] : 'bg-grit-warning')}
              />
            ))}
          </span>
        </span>
      )}
      {overflow > 0 && (
        <span aria-hidden="true" className="hidden font-grit-body text-[10px] font-semibold text-grit-cyan sm:inline">
          +{overflow}
        </span>
      )}
    </button>
  );
}
