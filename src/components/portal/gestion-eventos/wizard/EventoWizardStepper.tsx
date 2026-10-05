'use client';

import { GritIcon, cx, gritFocusRing } from '@/components/ui';
import { EVENTO_WIZARD_STEPS, type EventoWizardStep } from '@/types/portal/eventos.types';

type EventoWizardStepperProps = {
  current: EventoWizardStep;
  stepsWithErrors: EventoWizardStep[];
  onGoTo: (step: EventoWizardStep) => void;
  disabled?: boolean;
};

export function EventoWizardStepper({ current, stepsWithErrors, onGoTo, disabled }: EventoWizardStepperProps) {
  const currentStep = EVENTO_WIZARD_STEPS.find((item) => item.step === current) ?? EVENTO_WIZARD_STEPS[0];

  return (
    <nav className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-3 backdrop-blur-md sm:p-4">
      <p className="mb-2 font-grit-body text-xs font-semibold text-grit-subtext sm:hidden">
        Paso {current} de {EVENTO_WIZARD_STEPS.length} · {currentStep.label}
      </p>
      <ol aria-label="Pasos del evento" className="flex items-center gap-2 sm:gap-3">
        {EVENTO_WIZARD_STEPS.map((item, index) => {
          const isCurrent = item.step === current;
          const isDone = item.step < current;
          const hasError = stepsWithErrors.includes(item.step);

          return (
            <li key={item.step} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onGoTo(item.step)}
                disabled={disabled}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Paso ${item.step}: ${item.label}${hasError ? ' (revisar)' : isDone ? ' (completado)' : ''}`}
                className={cx(
                  'flex min-w-0 items-center gap-2 rounded-grit-md px-1.5 py-1 text-left transition disabled:cursor-not-allowed',
                  gritFocusRing,
                )}
              >
                <span
                  className={cx(
                    'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-grit-title text-sm font-bold',
                    isCurrent && 'border-grit-cyan bg-grit-cyan text-grit-bg',
                    !isCurrent && isDone && 'border-grit-cyan/60 bg-grit-cyan/10 text-grit-cyan',
                    !isCurrent && !isDone && 'border-grit-glass-border bg-grit-card text-grit-subtext',
                  )}
                >
                  {isDone && !hasError ? <GritIcon name="check" size={18} /> : <GritIcon name={item.icon} size={18} />}
                  {hasError && (
                    <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-grit-bg bg-grit-danger" />
                  )}
                </span>
                <span className="hidden min-w-0 flex-col sm:flex">
                  <span className="font-grit-body text-[11px] uppercase tracking-wide text-grit-muted">Paso {item.step}</span>
                  <span
                    className={cx(
                      'truncate font-grit-body text-sm font-semibold',
                      isCurrent ? 'text-grit-text' : 'text-grit-subtext',
                    )}
                  >
                    {item.label}
                  </span>
                  {hasError && <span className="font-grit-body text-[11px] font-semibold text-grit-danger">Revisar</span>}
                </span>
              </button>
              {index < EVENTO_WIZARD_STEPS.length - 1 && (
                <span aria-hidden="true" className="h-px flex-1 bg-grit-glass-border" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
