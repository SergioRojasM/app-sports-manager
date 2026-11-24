import { GritCard, GritIcon, cx } from '@/components/ui';
import type { MisReservasStats as MisReservasStatsData } from '@/types/portal/reservas.types';

const ITEMS: { key: keyof MisReservasStatsData; label: string; icon: string; iconClass: string }[] = [
  { key: 'reservas', label: 'Reservas', icon: 'event', iconClass: 'text-grit-text' },
  { key: 'asistidas', label: 'Asistidas', icon: 'check_circle', iconClass: 'text-grit-cyan' },
  { key: 'noAsistio', label: 'No asistió', icon: 'cancel', iconClass: 'text-grit-danger' },
  { key: 'canceladas', label: 'Canceladas', icon: 'block', iconClass: 'text-grit-muted' },
];

/** Stats strip of /portal/mis-reservas (grit-arena-v3 `aVWHV`), computed from the filtered rows. */
export function MisReservasStats({ stats }: { stats: MisReservasStatsData }) {
  return (
    <GritCard variant="card" padding="none" className="rounded-[24px] px-[26px] py-[18px]">
      <dl className="grid grid-cols-2 gap-y-4 md:grid-cols-4">
        {ITEMS.map((item, index) => (
          <div
            key={item.key}
            className={cx('flex items-center gap-3.5', index > 0 && 'md:border-l md:border-white/[0.08] md:pl-[26px]', index % 2 === 1 && 'max-md:pl-4')}
          >
            <GritIcon name={item.icon} size={20} className={item.iconClass} />
            <dd className="font-grit-title text-4xl font-light leading-none text-grit-text">{stats[item.key]}</dd>
            <dt className="font-grit-body text-xs text-grit-subtext">{item.label}</dt>
          </div>
        ))}
      </dl>
    </GritCard>
  );
}
