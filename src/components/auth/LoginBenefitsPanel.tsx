import Image from "next/image";

export function LoginBenefitsPanel() {
  return (
    <section className="relative flex w-full flex-col justify-between overflow-hidden bg-navy-deep p-6 md:w-1/2 md:p-10">
      <div className="pointer-events-none absolute inset-0 radial-glow" />

      <div className="relative z-10 flex h-full flex-col pt-1 pl-3 md:pt-1 md:pl-8">
        <header className="xl-6 flex items-center gap-3">
          <div className="size-30 align-middle relative">
            <Image
                src="/logo.png"
              alt="Logo de Qbop Sports Manager"
                fill
                className="object-contain"
            />
            </div>
        </header>

        <div className="max-w-lg">
          <h1 className="mb-4 text-3xl font-bold leading-[1.1] text-slate-100 md:text-4xl lg:text-5xl">
            Optimiza el <span className="text-turquoise">Rendimiento de tu Equipo</span>
          </h1>
          <p className="mb-6 text-base leading-relaxed text-slate-400 md:text-lg">
            Simplifica la gestión de atletas y obtén información basada en datos para potenciar
            el rendimiento de tu equipo con nuestra plataforma SaaS profesional.
          </p>
        </div>

        <ul className="grid max-w-md grid-cols-1 gap-4" aria-label="Beneficios de la plataforma">
          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">monitoring</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Analítica Avanzada de Rendimiento
              </h3>
              <p className="text-sm text-slate-500">Profundiza en métricas individuales y del equipo.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Gestión de Sesiones de Entrenamiento
              </h3>
              <p className="text-sm text-slate-500">Programa ejercicios y controla la disponibilidad de jugadores.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Información del Equipo en Tiempo Real
              </h3>
              <p className="text-sm text-slate-500">Retroalimentación instantánea durante sesiones activas.</p>
            </div>
          </li>

          <li className="group flex items-start gap-3">
            <div className="flex size-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 text-turquoise transition-colors group-hover:bg-turquoise/20">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                <span className="mr-2 text-turquoise">•</span>Reportes Centralizados
              </h3>
              <p className="text-sm text-slate-500">Paneles completos para cada entrenador.</p>
            </div>
          </li>
        </ul>

        <p className="mt-auto pt-6 text-xs text-slate-600">© 2026 qbop training Inc. Todos los derechos reservados.</p>
      </div>
    </section>
  );
}
