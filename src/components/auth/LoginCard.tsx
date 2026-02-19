import type { ReactNode } from "react";

type LoginCardProps = {
  children: ReactNode;
};

export function LoginCard({ children }: LoginCardProps) {
  return (
    <section className="flex w-full items-center justify-center bg-navy-soft p-4 md:w-1/2 md:p-8">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-navy-medium/70 p-6 shadow-2xl backdrop-blur-sm md:p-7">
        {children}
      </div>
    </section>
  );
}
