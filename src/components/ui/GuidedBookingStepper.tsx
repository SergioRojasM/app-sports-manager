'use client';

type GuidedBookingStepperProps = {
  /** One of GUIDED_SIGNUP_STEPS / GUIDED_LOGIN_STEPS / GUIDED_BOOKING_STEPS (guidedBooking.ts) — each phase owns its own independent list, not a single continuous 1-N sequence across pages. */
  steps: readonly string[];
  /** 1-indexed within `steps`. */
  currentStep: number;
  trainingNombre?: string;
};

export function GuidedBookingStepper({ steps, currentStep, trainingNombre }: GuidedBookingStepperProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 rounded-xl border border-slate-700 bg-navy-deep/60 px-4 py-3"
    >
      {trainingNombre && (
        <p className="mb-2 text-xs text-slate-400">
          Reservando: <span className="font-semibold text-slate-200">{trainingNombre}</span>
        </p>
      )}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                  (isCompleted
                    ? 'bg-turquoise text-navy-deep'
                    : isCurrent
                      ? 'border-2 border-turquoise text-turquoise'
                      : 'border border-slate-600 text-slate-500')
                }
              >
                {isCompleted ? (
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    check
                  </span>
                ) : (
                  stepNumber
                )}
              </span>
              <span
                className={
                  'text-xs font-medium ' + (isCurrent ? 'text-slate-100' : isCompleted ? 'text-slate-300' : 'text-slate-500')
                }
              >
                {label}
              </span>
              {stepNumber < steps.length && <span className="mx-1 h-px w-4 bg-slate-700" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
