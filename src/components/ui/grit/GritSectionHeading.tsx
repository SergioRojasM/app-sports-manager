import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

type GritSectionHeadingProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot (badge, button…). */
  action?: ReactNode;
  /** md = 17px, lg = 19px (v3 panel titles). */
  size?: 'md' | 'lg';
  as?: 'h2' | 'h3';
  /** Id of the heading element, e.g. for a dialog's `aria-labelledby`. */
  id?: string;
  /**
   * Material Symbols name rendered as a 36px round chip with a 16px cyan icon before the title —
   * the settings section headers of `aYwNn` (`wallet`, `gavel`, `bell-ring`…). Decorative.
   */
  icon?: string;
  className?: string;
};

/** Section / panel title (+ optional subtitle and action) from the v3 panel headings (US-0141). */
export function GritSectionHeading({
  title,
  subtitle,
  action,
  size = 'lg',
  as: Tag = 'h2',
  id,
  icon,
  className,
}: GritSectionHeadingProps) {
  const text = (
    <div className={cx('flex flex-col gap-1', icon && 'min-w-0')}>
      <Tag
        id={id}
        className={cx(
          'font-grit-title font-medium leading-tight text-grit-text',
          size === 'lg' ? 'text-[19px]' : 'text-[17px]',
        )}
      >
        {title}
      </Tag>
      {subtitle && (
        <p className="font-grit-body text-xs text-grit-muted">
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      {icon ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-grit-cyan"
          >
            <GritIcon name={icon} size={16} />
          </span>
          {text}
        </div>
      ) : (
        text
      )}
      {action}
    </div>
  );
}
