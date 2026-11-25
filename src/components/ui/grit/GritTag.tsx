import type { ReactNode } from 'react';
import { GritIcon } from './GritIcon';
import { cx } from './styles';

export type GritTagTone = 'accent' | 'neutral' | 'warning' | 'danger' | 'violet';

type GritTagProps = {
  children: ReactNode;
  /**
   * accent = Status / Activo · neutral = Role / Atleta · warning = Status / Mora, Role / Admin ·
   * danger = Status / Suspendido · violet = Status / Pendiente, Role / Entrenador.
   */
  tone?: GritTagTone;
  /** Leading 6px dot in the text colour — use it for record *status* (not for roles). */
  dot?: boolean;
  icon?: string;
  /** Optional text-colour class overriding the tone (e.g. a discipline colour). */
  colorClass?: string;
  className?: string;
};

/** Tinted tones follow one formula: ~8–10% fill, 25% stroke, full-colour text. */
const TONE_CLASSES: Record<GritTagTone, { box: string; text: string }> = {
  accent: { box: 'border-grit-cyan/25 bg-grit-cyan/10', text: 'text-grit-cyan' },
  neutral: { box: 'border-white/10 bg-white/[0.04]', text: 'text-grit-subtext' },
  warning: { box: 'border-grit-warning/25 bg-grit-warning/[0.08]', text: 'text-grit-warning' },
  danger: { box: 'border-grit-danger/25 bg-grit-danger/[0.08]', text: 'text-grit-danger' },
  violet: { box: 'border-grit-violet/25 bg-grit-violet/[0.08]', text: 'text-grit-violet' },
};

/** Status / role pill from the v3 Status and Role components (`Y8D4zJ`, `DOceZ`, `yNrdr`…, US-0141). */
export function GritTag({ children, tone = 'accent', dot, icon, colorClass, className }: GritTagProps) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-grit-body text-[11px] font-semibold leading-none',
        toneClasses.box,
        colorClass ?? toneClasses.text,
        className,
      )}
    >
      {dot && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {icon && <GritIcon name={icon} size={13} />}
      {children}
    </span>
  );
}
