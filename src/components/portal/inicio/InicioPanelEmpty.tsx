import type { ReactNode } from 'react';
import { GritIcon, cx } from '@/components/ui';

type InicioPanelEmptyProps = {
  icon: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/**
 * Empty state inside an Inicio panel (icon ring + title + text, `JB6Bf`).
 * `GritEmptyState` is a card of its own, which would nest a card in a card here.
 * Promote to the kit (`GritEmptyState variant="inline"`) when a second page needs it.
 */
export function InicioPanelEmpty({ icon, title, description, action, className }: InicioPanelEmptyProps) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-cyan">
        <GritIcon name={icon} size={22} />
      </span>
      <h3 className="mt-0.5 font-grit-body text-sm font-medium text-grit-text">{title}</h3>
      {description && <p className="font-grit-body text-xs text-grit-muted">{description}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
