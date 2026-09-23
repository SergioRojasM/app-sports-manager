import type { ReactNode } from 'react';
import { cx } from './styles';

type GritPageHeaderProps = {
  title: ReactNode;
  /** Second part of the title rendered in cyan (marketplace "Entrenamientos Públicos" style). */
  titleAccent?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  italic?: boolean;
  /** Right-aligned slot for page-level actions. */
  actions?: ReactNode;
  className?: string;
};

/** Page title block (the page's single h1) from the design's Page Header (US-0116). */
export function GritPageHeader({ title, titleAccent, eyebrow, subtitle, italic, actions, className }: GritPageHeaderProps) {
  return (
    <header className={cx('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && <span className="font-grit-body text-xs font-semibold text-grit-cyan">{eyebrow}</span>}
        <h1
          className={cx(
            'font-grit-title text-3xl font-bold leading-tight text-grit-text sm:text-[36px]',
            italic && 'italic',
          )}
        >
          {title}
          {titleAccent && <> <span className="text-grit-cyan">{titleAccent}</span></>}
        </h1>
        {subtitle && <p className="font-grit-body text-sm text-grit-subtext">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
