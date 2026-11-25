import type { ReactNode } from 'react';
import { cx } from './styles';

type GritFieldProps = {
  /** Id of the control inside; the label points at it and the hint / error ids derive from it. */
  htmlFor: string;
  label: ReactNode;
  /** 11px muted helper under the control (`{htmlFor}-hint`). */
  hint?: ReactNode;
  /** 12px danger message under the control (`{htmlFor}-error`, `role="alert"`). */
  error?: ReactNode;
  /** Marks the label with a muted "(opcional)". */
  optional?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Form field frame — DESIGN.md §9 "Forms — derived": label 12/600 `grit-subtext`, helper 11px
 * `grit-muted`, inline error 12px `grit-danger`. The control itself sets
 * `aria-describedby={gritDescribedBy(id, hint, error)}` and `aria-invalid`.
 */
export function GritField({ htmlFor, label, hint, error, optional, children, className }: GritFieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="font-grit-body text-xs font-semibold text-grit-subtext">
        {label}
        {optional && <span className="ml-1 font-normal text-grit-muted">(opcional)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="font-grit-body text-[11px] text-grit-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="font-grit-body text-xs text-grit-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** `aria-describedby` value for a control framed by GritField (undefined when there is nothing to describe). */
export function gritDescribedBy(id: string, hint?: unknown, error?: unknown): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}
