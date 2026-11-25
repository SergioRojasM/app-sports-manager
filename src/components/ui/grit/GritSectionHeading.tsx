import type { ReactNode } from 'react';
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
  className,
}: GritSectionHeadingProps) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex flex-col gap-1">
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
      {action}
    </div>
  );
}
