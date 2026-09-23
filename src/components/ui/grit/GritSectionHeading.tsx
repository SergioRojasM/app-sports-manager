import type { ReactNode } from 'react';
import { cx } from './styles';

type GritSectionHeadingProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right-aligned slot (badge, button…). */
  action?: ReactNode;
  /** md = 20px, lg = 22px. */
  size?: 'md' | 'lg';
  as?: 'h2' | 'h3';
  className?: string;
};

/** Section title (+ optional subtitle and action) from the design's section headings (US-0116). */
export function GritSectionHeading({
  title,
  subtitle,
  action,
  size = 'lg',
  as: Tag = 'h2',
  className,
}: GritSectionHeadingProps) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="flex flex-col gap-1">
        <Tag
          className={cx(
            'font-grit-title font-bold leading-tight text-grit-text',
            size === 'lg' ? 'text-[22px]' : 'text-xl',
          )}
        >
          {title}
        </Tag>
        {subtitle && (
          <p
            className={cx(
              'font-grit-body font-medium text-grit-subtext',
              size === 'lg' ? 'text-[13px]' : 'text-xs',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
