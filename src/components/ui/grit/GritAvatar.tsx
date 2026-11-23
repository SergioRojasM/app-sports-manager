import Image from 'next/image';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritAvatarProps = {
  /** Full name — initials are derived from it when there is no image. */
  name: string;
  /** Photo URL. Rendered decoratively (`alt=""`): the name is always printed next to the avatar. */
  src?: string | null;
  size?: 32 | 34 | 38;
  /**
   * neutral = dark teal fill (Avatar / Iniciales, table rows) · soft = cyan-tinted
   * (sidebar user card) · solid = cyan fill (topbar avatar).
   */
  tone?: 'neutral' | 'soft' | 'solid';
  className?: string;
};

const SIZES: Record<32 | 34 | 38, string> = {
  32: 'h-8 w-8',
  34: 'h-[34px] w-[34px]',
  38: 'h-[38px] w-[38px]',
};

const TONES = {
  neutral: 'bg-grit-avatar text-grit-text',
  soft: 'border border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-cyan',
  solid: 'bg-grit-cyan text-grit-on-brand',
} as const;

/** Up to two initials: first letter of the first and last words. */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const first = words[0][0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/** Round avatar from v3 Avatar / Iniciales, Avatar / Topbar and the User Card (`sFaSi`, `gNnuk`, US-0141). */
export function GritAvatar({ name, src, size = 34, tone = 'neutral', className }: GritAvatarProps) {
  return (
    <span
      className={cx(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full font-grit-body text-xs font-semibold',
        SIZES[size],
        TONES[tone],
        className,
      )}
    >
      {src ? (
        <Image src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        initialsOf(name) || <GritIcon name="person" size={size === 32 ? 16 : 18} />
      )}
    </span>
  );
}
