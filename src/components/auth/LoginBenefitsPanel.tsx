export function LoginBenefitsPanel() {
  return (
    <section className="relative flex w-full flex-col justify-between overflow-hidden bg-navy-deep p-6 md:w-1/2 md:p-10">
      <div className="pointer-events-none absolute inset-0 radial-glow" />

      <div className="relative z-10 flex h-full flex-col pt-6 pl-3 md:pt-10 md:pl-8">
        <header className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-turquoise/10 text-turquoise">
            <span className="material-symbols-outlined text-3xl">sports_football</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-100">qbop training</h2>
        </header>

        <div className="max-w-lg">
          <h1 className="mb-4 text-3xl font-bold leading-[1.1] text-slate-100 md:text-4xl lg:text-5xl">
            Optimize Your <span className="text-turquoise">Team Performance</span>
          </h1>
          <p className="mb-6 text-base leading-relaxed text-slate-400 md:text-lg">
            Streamline athlete management and unlock data-driven insights to elevate your
            squad&apos;s potential with our professional SaaS platform.
          </p>
        </div>

        <ul className="grid max-w-md grid-cols-1 gap-4" aria-label="Platform benefits">
          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Advanced Performance Analytics
              </h3>
              <p className="text-sm text-slate-500">Deep dive into individual and team metrics.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Training Session Management
              </h3>
              <p className="text-sm text-slate-500">Schedule drills and track player availability.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Real-Time Team Insights
              </h3>
              <p className="text-sm text-slate-500">Instant feedback loops during active sessions.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Centralized Reports
              </h3>
              <p className="text-sm text-slate-500">Comprehensive dashboards for every coach.</p>
            </div>
          </li>
        </ul>

        <p className="mt-auto pt-6 text-xs text-slate-600">© 2026 qbop training Inc. All rights reserved.</p>
      </div>
    </section>
  );
}
