import { Fragment } from 'react';

interface ConnectedStep {
  icon: string;
  label: string;
}

interface ConnectedStepsBarProps {
  title: string;
  highlightedSubtitle: string;
  steps: ConnectedStep[];
}

export default function ConnectedStepsBar({ title, highlightedSubtitle, steps }: ConnectedStepsBarProps) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-landing-border bg-[#16233864] px-6 py-6 lg:flex-row lg:justify-between lg:px-8">
      <div className="flex items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-landing-primary/20 bg-landing-primary/10">
          <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-landing-primary">
            shield
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-landing-display text-lg font-bold italic leading-snug text-landing-text">
            {title}
          </span>
          <span className="font-landing-display text-lg font-bold italic leading-snug text-landing-primary">
            {highlightedSubtitle}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-1">
        {steps.map((step, index) => (
          <Fragment key={step.label}>
            {index > 0 && <div className="landing-step-connector mt-[17px] hidden self-start sm:block" />}
            <div className="flex w-16 flex-col items-center gap-1.5">
              <div className="flex size-9 items-center justify-center rounded-full border border-landing-border">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] text-landing-primary">
                  {step.icon}
                </span>
              </div>
              <span className="font-landing-body text-center text-[11px] text-landing-text-secondary">
                {step.label}
              </span>
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
