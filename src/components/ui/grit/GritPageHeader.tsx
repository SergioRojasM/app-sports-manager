import type { ReactNode } from 'react';
import { cx } from './styles';

type GritPageHeaderProps = {
  title: ReactNode;
  /** Second part of the title rendered in cyan ("Gestiona tus *eventos.*"). */
  titleAccent?: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  /** Italicizes the accent only ("Indicadores *del club.*", design `IZudm`). */
  italic?: boolean;
  /**
   * light (default) = Exo 2 300, the page-title style · display = Exo 2 600 italic, the
   * record-name style ("GRIT 10K", design `xjlmU` `WcnLn`).
   */
  titleVariant?: 'light' | 'display';
  /** Inline element beside the title, outside the h1 (e.g. a "Check-in abierto" pill). */
  titleAdornment?: ReactNode;
  /** Right-aligned slot for page-level tools and the page CTA (`GritButton size="lg"`). */
  actions?: ReactNode;
  className?: string;
};

/** Page title block — the page's single h1 — from v3 Page Header / Page Title (`lnMVj`, `jHJwK`, US-0141). */
export function GritPageHeader({
  title,
  titleAccent,
  eyebrow,
  subtitle,
  italic,
  titleVariant = 'light',
  titleAdornment,
  actions,
  className,
}: GritPageHeaderProps) {
  const heading = (
    <h1
      className={cx(
        'font-grit-title text-[30px] leading-[1.1] text-grit-text sm:text-[40px]',
        titleVariant === 'display' ? 'font-semibold italic' : 'font-light',
      )}
    >
      {title}
      {titleAccent && (
        <>
          {' '}
          <span className={cx('text-grit-cyan', italic && 'italic')}>{titleAccent}</span>
        </>
      )}
    </h1>
  );

  return (
    <header className={cx('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow && (
          <span className="font-grit-body text-[11px] font-semibold uppercase tracking-[1.3px] text-grit-cyan">{eyebrow}</span>
        )}
        {titleAdornment ? (
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
            {heading}
            {titleAdornment}
          </div>
        ) : (
          heading
        )}
        {subtitle && <div className="font-grit-body text-[13px] text-grit-subtext">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
