import { GritAvatarImage } from './GritAvatarImage';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

/** 32 / 34 / 38 = people · 20 / 26 / 36 / 42 / 52 / 56 = organization marks (`tone="org"`). */
type GritAvatarSize = 20 | 26 | 32 | 34 | 36 | 38 | 42 | 52 | 56;

type GritAvatarProps = {
  /** Full name — initials are derived from it when there is no image. */
  name: string;
  /** Photo URL. Rendered decoratively (`alt=""`): the name is always printed next to the avatar. */
  src?: string | null;
  size?: GritAvatarSize;
  /**
   * neutral = dark teal fill (Avatar / Iniciales, table rows) · soft = cyan-tinted
   * (sidebar user card) · solid = cyan fill (topbar avatar) · org = club mark
   * (dark fill, cyan stroke, cyan italic Exo 2 initials).
   */
  tone?: 'neutral' | 'soft' | 'solid' | 'org';
  /** circle (default) · rounded = 18px-radius square (organization logo of the admin identity card, `aYwNn` `YfbBZ`). */
  shape?: 'circle' | 'rounded';
  /** Called when the image fails (e.g. useTenantBrandingImages' signed-URL retry). */
  onImageError?: () => void;
  className?: string;
};

const SIZES: Record<GritAvatarSize, string> = {
  20: 'h-5 w-5',
  26: 'h-[26px] w-[26px]',
  32: 'h-8 w-8',
  34: 'h-[34px] w-[34px]',
  36: 'h-9 w-9',
  38: 'h-[38px] w-[38px]',
  42: 'h-[42px] w-[42px]',
  52: 'h-[52px] w-[52px]',
  56: 'h-14 w-14',
};

const TONES = {
  neutral: 'bg-grit-avatar font-grit-body font-semibold text-grit-text',
  soft: 'border border-grit-cyan/35 bg-grit-cyan/[0.12] font-grit-body font-semibold text-grit-cyan',
  solid: 'bg-grit-cyan font-grit-body font-semibold text-grit-on-brand',
  org: 'border border-grit-cyan/50 bg-grit-bg/80 font-grit-title italic text-grit-cyan',
} as const;

/** Up to two initials: first letter of the first and last words. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Round avatar from v3 Avatar / Iniciales, Avatar / Topbar, the User Card and the club marks (`sFaSi`, `gNnuk`, `orsH4`). */
export function GritAvatar({ name, src, size = 34, tone = 'neutral', shape = 'circle', onImageError, className }: GritAvatarProps) {
  const isOrg = tone === 'org';
  // People avatars keep the 12px initials; org marks scale them with the circle (~0.36 × size).
  const fontSize = isOrg ? Math.max(8, Math.round(size * 0.36)) : 12;
  const initials = initialsOf(name);
  const fallback = initials || <GritIcon name={isOrg ? 'shield' : 'person'} size={Math.round(size * 0.5)} />;

  return (
    <span
      className={cx('flex shrink-0 items-center justify-center overflow-hidden leading-none', shape === 'rounded' ? 'rounded-[18px]' : 'rounded-full', SIZES[size], TONES[tone], className)}
      // Org marks are Exo 2 700 (`orsH4`); set inline so title-weight lint (DESIGN.md §11) stays meaningful.
      style={isOrg ? { fontSize, fontWeight: 700 } : { fontSize }}
    >
      {src ? <GritAvatarImage src={src} fallback={fallback} onError={onImageError} /> : fallback}
    </span>
  );
}
