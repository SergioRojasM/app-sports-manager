import type { ReactNode } from 'react';
import { GritButton, GritCard, GritIcon, GritSectionHeading, cx } from '@/components/ui';

type TenantSettingsSectionProps = {
  icon: string;
  title: string;
  subtitle?: ReactNode;
  /** Right-aligned header control, usually "Agregar" (`outline-accent sm`). */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Settings section of the organization page — DESIGN.md §9 "Settings sections (`aYwNn`)":
 * `GritCard card` (padding 22, gap 18) with an icon `GritSectionHeading` and its action.
 */
export function TenantSettingsSection({ icon, title, subtitle, action, children, className }: TenantSettingsSectionProps) {
  return (
    <GritCard as="section" variant="card" padding="none" className={cx('flex flex-col gap-[18px] p-5 sm:p-[22px]', className)}>
      <GritSectionHeading icon={icon} title={title} subtitle={subtitle} action={action} size="md" />
      {children}
    </GritCard>
  );
}

type SectionMessageProps = {
  kind: 'loading' | 'error' | 'empty';
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  onRetry?: () => void;
  children?: ReactNode;
};

/** Inline loading / error / empty block inside a settings section (an inset surface, not a nested card). */
export function SectionMessage({ kind, icon, title, description, onRetry, children }: SectionMessageProps) {
  const defaultIcon = kind === 'loading' ? 'hourglass_empty' : kind === 'error' ? 'error' : 'inbox';
  return (
    <div
      role={kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined}
      className="flex flex-col items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-4 py-7 text-center"
    >
      <div className={cx('flex items-center gap-2.5 font-grit-body text-[13px] font-medium', kind === 'error' ? 'text-grit-danger' : 'text-grit-text')}>
        <GritIcon name={icon ?? defaultIcon} size={16} className={kind === 'error' ? 'text-grit-danger' : 'text-grit-muted'} />
        {title}
      </div>
      {description ? <p className="max-w-sm font-grit-body text-xs text-grit-muted">{description}</p> : null}
      {onRetry ? (
        <GritButton size="sm" variant="secondary" icon="refresh" onClick={onRetry}>
          Reintentar
        </GritButton>
      ) : null}
      {children}
    </div>
  );
}
