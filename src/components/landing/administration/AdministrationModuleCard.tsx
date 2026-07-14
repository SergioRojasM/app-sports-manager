import type { ReactNode } from 'react';

interface AdministrationModuleCardProps {
  icon: string;
  title: string;
  items: string[];
  children: ReactNode;
}

export default function AdministrationModuleCard({ icon, title, items, children }: AdministrationModuleCardProps) {
  return (
    <article className="grid grid-cols-1 gap-6 rounded-2xl border border-[#0fa3ab52] bg-[#1623385d] p-6 sm:grid-cols-[150px_1fr]">
      <div className="flex flex-col gap-3">
        <div className="flex size-12 items-center justify-center rounded-full border border-landing-primary/20 bg-landing-primary/10">
          <span aria-hidden="true" className="material-symbols-outlined text-[24px] text-landing-primary">
            {icon}
          </span>
        </div>

        <h3 className="font-landing-display text-[19px] font-bold italic leading-tight text-landing-text">
          {title}
        </h3>

        <div className="h-[3px] w-8 rounded-full bg-landing-primary" />

        <ul className="mt-1 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-landing-primary">
                check_circle
              </span>
              <span className="font-landing-body text-[11.5px] text-landing-text-secondary">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-landing-border bg-landing-surface-elevated p-3.5">{children}</div>
    </article>
  );
}
