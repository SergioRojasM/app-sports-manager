import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritIconButtonSize = 'sm' | 'md' | 'lg';
type GritIconButtonVariant = 'default' | 'ghost';

type GritIconButtonBaseProps = {
  icon: string;
  /** Required accessible name (becomes `aria-label`) — an icon alone says nothing to a screen reader. */
  label: string;
  /** sm 30px (Row Action) · md 38px · lg 44px (Icon Button). */
  size?: GritIconButtonSize;
  /** default = white 4% fill + white 12% stroke · ghost = white 3% fill, no stroke. */
  variant?: GritIconButtonVariant;
  className?: string;
};

type GritIconButtonAsButton = GritIconButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'aria-label'> & { href?: undefined };

type GritIconButtonAsLink = GritIconButtonBaseProps & { href: string; onClick?: () => void };

type GritIconButtonProps = GritIconButtonAsButton | GritIconButtonAsLink;

const SIZES: Record<GritIconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'h-[30px] w-[30px]', icon: 14 },
  md: { box: 'h-[38px] w-[38px]', icon: 16 },
  lg: { box: 'h-11 w-11', icon: 17 },
};

const VARIANTS: Record<GritIconButtonVariant, string> = {
  default: 'border border-white/[0.12] bg-white/[0.04] text-grit-text hover:bg-white/[0.08]',
  ghost: 'bg-white/[0.03] text-grit-subtext hover:bg-white/[0.08] hover:text-grit-text',
};

/** Round icon-only button from v3 Icon Button / Icon Button Large / Row Action (`cA3ke`, `fBFBp`, `J4S1Zw`, US-0141). */
export const GritIconButton = forwardRef<HTMLButtonElement, GritIconButtonProps>(function GritIconButton(
  { icon, label, size = 'md', variant = 'default', className, ...rest },
  ref,
) {
  const sizing = SIZES[size];
  const classes = cx(
    'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60',
    sizing.box,
    VARIANTS[variant],
    gritFocusRing,
    className,
  );
  const iconNode = <GritIcon name={icon} size={sizing.icon} />;

  if (rest.href !== undefined) {
    const { href, onClick } = rest as Omit<GritIconButtonAsLink, keyof GritIconButtonBaseProps>;
    return (
      <Link href={href} onClick={onClick} aria-label={label} className={classes}>
        {iconNode}
      </Link>
    );
  }

  const { type = 'button', ...buttonProps } = rest as Omit<GritIconButtonAsButton, keyof GritIconButtonBaseProps>;
  return (
    <button ref={ref} type={type} aria-label={label} className={classes} {...buttonProps}>
      {iconNode}
    </button>
  );
});
