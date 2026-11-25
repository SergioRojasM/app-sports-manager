import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { GritIconButton } from './GritIconButton';
import { cx } from './styles';

export type GritAlertTone = 'success' | 'warning' | 'danger' | 'info';

type GritAlertProps = {
  children: ReactNode;
  tone?: GritAlertTone;
  /** Overrides the tone's default icon. */
  icon?: string;
  /** Right-aligned control, e.g. a "Reintentar" `GritButton size="sm" variant="secondary"`. */
  action?: ReactNode;
  /** Shows a close button ("Cerrar mensaje") that calls this. */
  onDismiss?: () => void;
  className?: string;
};

const TONES: Record<GritAlertTone, { box: string; icon: string; role: 'status' | 'alert' }> = {
  success: { box: 'border-grit-success/35 bg-grit-success/10 text-grit-success', icon: 'check_circle', role: 'status' },
  info: { box: 'border-grit-cyan/35 bg-grit-cyan/10 text-grit-cyan', icon: 'info', role: 'status' },
  warning: { box: 'border-grit-warning/35 bg-grit-warning/10 text-grit-warning', icon: 'warning', role: 'alert' },
  danger: { box: 'border-grit-danger/35 bg-grit-danger/10 text-grit-danger', icon: 'error', role: 'alert' },
};

/**
 * Inline banner for page-level feedback (saved, toggled, failed). v3 draws no banner, so it is
 * derived from the tinted Status tags: token at 10% fill and 35% stroke, 16px radius. success/info
 * announce politely (`role="status"`); warning/danger interrupt (`role="alert"`).
 */
export function GritAlert({ children, tone = 'info', icon, action, onDismiss, className }: GritAlertProps) {
  const config = TONES[tone];
  return (
    <div
      role={config.role}
      className={cx(
        'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[16px] border px-4 py-3 font-grit-body text-[13px]',
        config.box,
        className,
      )}
    >
      <GritIcon name={icon ?? config.icon} size={18} className="shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      {action}
      {onDismiss && <GritIconButton icon="close" label="Cerrar mensaje" size="sm" variant="ghost" onClick={onDismiss} />}
    </div>
  );
}
