import { GritIcon } from './GritIcon';
import { cx } from './styles';

export type GritIconTileTone = 'card' | 'accent' | 'warning' | 'violet' | 'danger';

type GritIconTileProps = {
  icon: string;
  /** 34 = info rows, 38 = notification items, 40 = KPI cards, 48 = CTA banners / empty states. */
  size?: 34 | 38 | 40 | 48;
  /** rounded = 12px tile (notification icons), circle = round chip (KPI cards). */
  shape?: 'rounded' | 'circle';
  /** card = neutral tile with a cyan icon; the others are tinted (10% fill, 25% stroke). */
  tone?: GritIconTileTone;
  className?: string;
};

const TILE: Record<34 | 38 | 40 | 48, { box: string; icon: number }> = {
  34: { box: 'h-[34px] w-[34px]', icon: 15 },
  38: { box: 'h-[38px] w-[38px]', icon: 16 },
  40: { box: 'h-10 w-10', icon: 17 },
  48: { box: 'h-12 w-12', icon: 22 },
};

const TONE_CLASSES: Record<GritIconTileTone, string> = {
  card: 'border-white/[0.08] bg-white/[0.04] text-grit-cyan',
  accent: 'border-grit-cyan/25 bg-grit-cyan/10 text-grit-cyan',
  warning: 'border-grit-warning/25 bg-grit-warning/10 text-grit-warning',
  violet: 'border-grit-violet/25 bg-grit-violet/10 text-grit-violet',
  danger: 'border-grit-danger/25 bg-grit-danger/10 text-grit-danger',
};

/** Icon container from the v3 Icon Chip / notification Icon frames (US-0141). */
export function GritIconTile({ icon, size = 34, shape = 'rounded', tone = 'card', className }: GritIconTileProps) {
  const tile = TILE[size];
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center border',
        tile.box,
        shape === 'circle' ? 'rounded-full' : 'rounded-grit-lg',
        TONE_CLASSES[tone],
        className,
      )}
    >
      <GritIcon name={icon} size={tile.icon} />
    </span>
  );
}
