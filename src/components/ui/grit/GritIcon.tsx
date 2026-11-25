import { cx } from './styles';

type GritIconProps = {
  /** Material Symbols Outlined ligature name (see icon-map.ts for design equivalents). */
  name: string;
  /** Rendered size in px. */
  size?: number;
  className?: string;
  /** When set, the icon is announced with this label instead of being hidden. */
  label?: string;
};

/**
 * Material Symbols wrapper at weight 300, which approximates the design's thin
 * Lucide stroke (US-0116). Decorative by default.
 */
export function GritIcon({ name, size = 16, className, label }: GritIconProps) {
  return (
    <span
      className={cx('material-symbols-outlined shrink-0 select-none', className)}
      style={{ fontSize: size, fontVariationSettings: '"FILL" 0, "wght" 300, "GRAD" 0, "opsz" 24' }}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}
