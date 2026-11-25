import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { GritIcon } from './GritIcon';
import { cx, gritFocusRing } from './styles';

/** danger = destructive confirm (secondary shape, danger tint) — never a solid red fill. */
type GritButtonVariant = 'primary' | 'secondary' | 'outline-accent' | 'ghost' | 'danger';
/** sm 31px (Button / Small) · md 37px (Button / Primary) · lg 42px (Button / Primary Glow). */
type GritButtonSize = 'sm' | 'md' | 'lg';

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
    /** React 19 ref-as-prop, e.g. to give a dialog's safe action the initial focus. */
    ref?: Ref<HTMLButtonElement>;
  };

type GritButtonAsLink = GritButtonBaseProps & {
  href: string;
  /** Opens in a new tab with a safe rel. */
  external?: boolean;
  onClick?: () => void;
};

type GritButtonProps = GritButtonAsButton | GritButtonAsLink;

const VARIANT_CLASSES: Record<GritButtonVariant, string> = {
  primary: 'bg-grit-cyan text-grit-on-brand hover:bg-grit-cyan-light',
  secondary: 'border border-white/[0.12] bg-white/[0.04] text-grit-text hover:bg-white/[0.08] [&>.material-symbols-outlined]:text-grit-subtext',
  'outline-accent': 'border border-grit-cyan/35 bg-grit-cyan/[0.08] text-grit-cyan hover:bg-grit-cyan/15',
  ghost: 'bg-transparent text-grit-subtext hover:bg-white/[0.04] hover:text-grit-text',
  danger: 'border border-grit-danger/35 bg-grit-danger/[0.08] text-grit-danger hover:bg-grit-danger/15',
};

const SIZE_CLASSES: Record<GritButtonSize, string> = {
  sm: 'min-h-[31px] gap-2 px-3.5 py-2 text-xs',
  md: 'min-h-[37px] gap-2 px-[18px] py-2.5 text-xs',
  lg: 'min-h-[42px] gap-2 px-[22px] py-3 text-[13px]',
};

/** Primary fills get a 1px top highlight; at `lg` they also glow (Button / Primary Glow — one per view). */
const PRIMARY_SHADOW = 'shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]';
const PRIMARY_GLOW = 'shadow-[0_8px_24px_rgba(20,219,196,0.35),inset_0_1px_0_rgba(255,255,255,0.4)]';

const ICON_SIZE: Record<GritButtonSize, number> = { sm: 14, md: 15, lg: 16 };

type LinkOnlyProps = Omit<GritButtonAsLink, keyof GritButtonBaseProps>;
type ButtonOnlyProps = Omit<GritButtonAsButton, keyof GritButtonBaseProps>;

/** Pill button / link-button from the v3 Button components (`DdNsJ`, `zG7Qt`, `yC90U`, `a8wf1a`, US-0141). */
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
    'inline-flex shrink-0 items-center justify-center rounded-full font-grit-body font-semibold leading-none transition disabled:cursor-not-allowed disabled:opacity-60',
    gritFocusRing,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    variant === 'primary' && (size === 'lg' ? PRIMARY_GLOW : PRIMARY_SHADOW),
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
