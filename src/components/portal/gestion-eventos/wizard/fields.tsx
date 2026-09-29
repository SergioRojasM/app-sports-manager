import type { ReactNode } from 'react';
import { GritIcon, cx, gritInputClass, gritSelectClass } from '@/components/ui';

/** DOM id for a validation error key, so focus requests from the hook can reach the field. */
export function fieldDomId(errorKey: string): string {
  return `evento-${errorKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
}

export function errorDomId(errorKey: string): string {
  return `${fieldDomId(errorKey)}-error`;
}

/** aria wiring for an input bound to `errorKey`. */
export function fieldA11y(errorKey: string, error: string | undefined, hintId?: string) {
  const describedBy = [error ? errorDomId(errorKey) : null, hintId ?? null].filter(Boolean).join(' ');
  return {
    id: fieldDomId(errorKey),
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  } as const;
}

export function inputClass(error?: string, extra?: string): string {
  return cx(gritInputClass, error && 'border-grit-danger focus:border-grit-danger focus:ring-grit-danger', extra);
}

export function selectClass(error?: string): string {
  return cx(gritSelectClass, error && 'border-grit-danger focus:border-grit-danger focus:ring-grit-danger');
}

export function FieldError({ errorKey, error }: { errorKey: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorDomId(errorKey)} className="mt-1 font-grit-body text-xs text-grit-danger">
      {error}
    </p>
  );
}

type FieldProps = {
  errorKey: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  hintId?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error + optional hint. The control must use `fieldA11y(errorKey, …)`. */
export function Field({ errorKey, label, required, error, hint, hintId, className, children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={fieldDomId(errorKey)} className="mb-1 block font-grit-body text-xs font-semibold text-grit-subtext">
        {label}
        {required && <span className="text-grit-danger"> *</span>}
      </label>
      {children}
      <FieldError errorKey={errorKey} error={error} />
      {hint && !error && (
        <p id={hintId} className="mt-1 font-grit-body text-[11px] text-grit-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Select with the kit's chevron. */
export function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <GritIcon
        name="expand_more"
        size={18}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-grit-muted"
      />
    </div>
  );
}

type SectionProps = {
  title: string;
  description?: string;
  icon?: string;
  children: ReactNode;
  action?: ReactNode;
};

/** A titled `GritCard`-like panel for one group of wizard fields. */
export function WizardSection({ title, description, icon, children, action }: SectionProps) {
  return (
    <section className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-5 backdrop-blur-md">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-grit-title text-base font-semibold text-grit-text">
            {icon && <GritIcon name={icon} size={18} className="text-grit-cyan" />}
            {title}
          </h3>
          {description && <p className="mt-0.5 font-grit-body text-xs text-grit-subtext">{description}</p>}
        </div>
        {action}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/** Small bordered icon button used for row actions (move, delete). */
export function RowIconButton({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-grit-md border border-grit-glass-border text-grit-subtext transition disabled:cursor-not-allowed disabled:opacity-40',
        danger ? 'hover:border-grit-danger/50 hover:text-grit-danger' : 'hover:border-grit-cyan/50 hover:text-grit-cyan',
      )}
    >
      <GritIcon name={icon} size={18} />
    </button>
  );
}
