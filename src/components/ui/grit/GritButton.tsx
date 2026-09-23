import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

type GritButtonVariant = 'primary' | 'secondary' | 'outline-accent' | 'ghost';
type GritButtonSize = 'sm' | 'md';

type GritButtonBaseProps = {
  children: ReactNode;
  variant?: GritButtonVariant;
  size?: GritButtonSize;
  icon?: string;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  className?: string;
};

type GritButtonAsButton = GritButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> & {
    href?: undefined;
    loading?: boolean;
    loadingLabel?: string;
  };

type GritButtonAsLink = GritButtonBaseProps & {
  href: string;
  /** Opens in a new tab with a safe rel. */
  external?: boolean;
  onClick?: () => void;
};

type GritButtonProps = GritButtonAsButton | GritButtonAsLink;

const VARIANT_CLASSES: Record<GritButtonVariant, string> = {
  primary: 'bg-grit-cyan font-bold text-grit-bg hover:bg-grit-cyan-light',
  secondary: 'border border-grit-glass-border bg-transparent font-bold text-grit-text hover:border-grit-cyan/60 hover:text-grit-cyan',
  'outline-accent': 'border border-grit-cyan bg-transparent font-bold text-grit-cyan hover:bg-grit-cyan/10',
  ghost: 'bg-transparent font-semibold text-grit-subtext hover:bg-grit-cyan/10 hover:text-grit-text',
};

const SIZE_CLASSES: Record<GritButtonSize, string> = {
  sm: 'gap-1.5 px-4 py-2.5 text-xs',
  md: 'gap-2 px-[22px] py-3.5 text-sm',
};

const ICON_SIZE: Record<GritButtonSize, number> = { sm: 13, md: 15 };

type LinkOnlyProps = Omit<GritButtonAsLink, keyof GritButtonBaseProps>;
type ButtonOnlyProps = Omit<GritButtonAsButton, keyof GritButtonBaseProps>;

/** Button / link-button from the design's Primary, Secondary and Maps buttons (radius 10, US-0116). */
export function GritButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  fullWidth,
  className,
  ...rest
}: GritButtonProps) {
  const classes = cx(
    'inline-flex items-center justify-center rounded-grit-md font-grit-body leading-none transition disabled:cursor-not-allowed disabled:opacity-60',
    gritFocusRing,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth && 'w-full',
    className,
  );

  const iconNode = icon ? <GritIcon name={icon} size={ICON_SIZE[size]} /> : null;

  if (rest.href !== undefined) {
    const { href, external, onClick } = rest as LinkOnlyProps;
    const content = (
      <>
        {iconPosition === 'start' && iconNode}
        {children}
        {iconPosition === 'end' && iconNode}
      </>
    );
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className={classes}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} onClick={onClick} className={classes}>
        {content}
      </Link>
    );
  }

  const { loading, loadingLabel, type = 'button', disabled, ...buttonProps } = rest as ButtonOnlyProps;

  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...buttonProps}>
      {iconPosition === 'start' && !loading && iconNode}
      {loading && loadingLabel ? loadingLabel : children}
      {iconPosition === 'end' && !loading && iconNode}
    </button>
  );
}
