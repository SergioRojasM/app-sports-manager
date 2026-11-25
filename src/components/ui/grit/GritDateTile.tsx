import { cx } from './styles';

type GritDateTileSize = 'sm' | 'md' | 'lg';
type GritDateTileTone = 'overlay' | 'accent' | 'muted';

type GritDateTileProps = {
  /** ISO instant; formatted in America/Bogota. `null` renders "Por definir". */
  dateIso: string | null;
  /** sm 56×46 (list rows) · md 48×52 (over photos) · lg 64×59 (hero). */
  size?: GritDateTileSize;
  /** overlay = glass over photos · accent = cyan-tinted (confirmed rows) · muted = neutral (past/cancelled rows). */
  tone?: GritDateTileTone;
  className?: string;
};

const TIME_ZONE = 'America/Bogota';

const SIZES: Record<GritDateTileSize, { box: string; day: string; month: string }> = {
  sm: { box: 'h-[46px] w-14 rounded-[14px] py-[7px]', day: 'text-[20px]', month: 'text-[9px] tracking-[1.2px]' },
  md: { box: 'h-[52px] w-12 rounded-[16px] py-2', day: 'text-[22px]', month: 'text-[10px] tracking-[1.5px]' },
  lg: { box: 'h-[59px] w-16 rounded-[16px] py-2', day: 'text-[29px]', month: 'text-[10px] tracking-[1.5px]' },
};

const TONES: Record<GritDateTileTone, { box: string; day: string; month: string }> = {
  overlay: { box: 'border border-white/20 bg-grit-bg/45 backdrop-blur-[14px]', day: 'text-grit-text', month: 'text-grit-cyan' },
  accent: { box: 'border border-grit-cyan/25 bg-grit-cyan/[0.08]', day: 'text-grit-text', month: 'text-grit-cyan' },
  muted: { box: 'border border-white/[0.07] bg-white/[0.02]', day: 'text-grit-muted', month: 'text-grit-muted' },
};

const dayFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: '2-digit' });
const monthFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, month: 'short' });
const longFormatter = new Intl.DateTimeFormat('es-CO', { timeZone: TIME_ZONE, day: 'numeric', month: 'long', year: 'numeric' });

/** Day + month parts of an instant in Bogotá, e.g. `{ day: '21', month: 'NOV', long: '21 de noviembre de 2026' }`. */
export function getBogotaDateTileParts(dateIso: string): { day: string; month: string; long: string } | null {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: dayFormatter.format(date),
    month: monthFormatter.format(date).replace('.', '').slice(0, 3).toUpperCase(),
    long: longFormatter.format(date),
  };
}

/** Day-over-month tile from v3 event cards and booking rows (`tsbPt`, `r9UZz`, `jLgGe`). */
export function GritDateTile({ dateIso, size = 'md', tone = 'overlay', className }: GritDateTileProps) {
  const parts = dateIso ? getBogotaDateTileParts(dateIso) : null;
  const sizing = SIZES[size];
  const toning = TONES[tone];

  return (
    <span
      role="img"
      aria-label={parts ? parts.long : 'Fecha por definir'}
      className={cx('flex shrink-0 flex-col items-center justify-center gap-px', sizing.box, toning.box, className)}
    >
      {parts ? (
        <>
          <span aria-hidden="true" className={cx('font-grit-title font-normal leading-none', sizing.day, toning.day)}>
            {parts.day}
          </span>
          <span aria-hidden="true" className={cx('font-grit-body font-bold leading-none', sizing.month, toning.month)}>
            {parts.month}
          </span>
        </>
      ) : (
        <span aria-hidden="true" className="px-1 text-center font-grit-body text-[9px] font-semibold leading-tight text-grit-subtext">
          Por definir
        </span>
      )}
    </span>
  );
}
