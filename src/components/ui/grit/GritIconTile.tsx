import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritIconTileProps = {
  icon: string;
  /** 34 = info rows, 40 = KPI cards, 48 = CTA banner. */
  size?: 34 | 40 | 48;
  shape?: 'rounded' | 'circle';
  /** card = dark tile, accent = cyan tinted tile. */
  tone?: 'card' | 'accent';
  className?: string;
};

const TILE: Record<34 | 40 | 48, { box: string; radius: string; icon: number }> = {
  34: { box: 'h-[34px] w-[34px]', radius: 'rounded-grit-md', icon: 15 },
  40: { box: 'h-10 w-10', radius: 'rounded-grit-md', icon: 18 },
  48: { box: 'h-12 w-12', radius: 'rounded-grit-lg', icon: 22 },
};

/** Square/round icon container from the design's Icon Wrap frames (US-0116). */
export function GritIconTile({ icon, size = 34, shape = 'rounded', tone = 'card', className }: GritIconTileProps) {
  const tile = TILE[size];
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center text-grit-cyan',
        tile.box,
        shape === 'circle' ? 'rounded-full' : tile.radius,
        tone === 'accent' ? 'bg-grit-cyan/[0.13]' : 'bg-grit-card',
        className,
      )}
    >
      <GritIcon name={icon} size={tile.icon} />
    </span>
  );
}
