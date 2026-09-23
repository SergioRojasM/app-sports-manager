import type { ReactNode } from 'react';
import { GritCard } from './GritCard';
import { GritIconTile } from './GritIconTile';
import { cx } from './styles';

type GritEmptyStateProps = {
  icon: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Heading level for the title — use 'h1' when the state replaces the whole page. */
  titleAs?: 'h1' | 'h2' | 'h3';
  /** Colour class for the description (e.g. text-grit-danger for errors). */
  descriptionClassName?: string;
  className?: string;
};

/** Loading / error / not-found / empty placeholder built from kit primitives (US-0116). */
export function GritEmptyState({
  icon,
  title,
  description,
  action,
  titleAs: Title = 'h2',
  descriptionClassName,
  className,
}: GritEmptyStateProps) {
  return (
    <GritCard variant="glass" padding="xl" className={cx('flex flex-col items-center gap-4 text-center', className)}>
      <GritIconTile icon={icon} size={48} tone="accent" />
      <div className="flex flex-col gap-1.5">
        <Title className="font-grit-title text-xl font-bold text-grit-text">{title}</Title>
        {description && (
          <p className={cx('font-grit-body text-[13px] font-medium', descriptionClassName ?? 'text-grit-subtext')}>
            {description}
          </p>
        )}
      </div>
      {action}
    </GritCard>
  );
}
