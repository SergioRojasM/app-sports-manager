import type { ReactNode } from "react";

type LoginCardProps = {
  children: ReactNode;
};

export function LoginCard({ children }: LoginCardProps) {
  // min-h-0 overrides the flex item's default min-height:auto, which would otherwise
  // let content overflow the h-screen parent instead of scrolling inside this section.
  return (
    <section className="flex w-full flex-1 min-h-0 items-start justify-center overflow-y-auto bg-navy-soft p-4 md:flex-none md:items-center md:overflow-visible md:w-1/2 md:p-8">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-navy-medium/70 p-6 shadow-2xl backdrop-blur-sm md:p-7">
        {children}
      </div>
    </section>
  );
}
