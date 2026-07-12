export default function TrustedBySection() {
  const teams = [
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH'
  ];

  return (
    <section id="trusted-by" className="py-12 border-y border-white/5 bg-white/[0.02]">
      <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mb-10">
        Confían en nuestra tecnología
      </p>

      <p className="mx-auto mb-10 max-w-4xl px-6 text-center font-landing-body text-sm leading-7 text-landing-text-secondary sm:text-base">
        Menos Excel, menos WhatsApp, menos seguimiento manual. Más control operativo, más trazabilidad y mejor experiencia para tu equipo y tus atletas.
      </p>
      
      <div className="overflow-hidden whitespace-nowrap relative">
        <div className="ticker gap-16 md:gap-32 items-center opacity-30 grayscale contrast-125">
          {/* First set of teams */}
          {teams.map((team, index) => (
            <h3
              key={`team-1-${index}`}
              className="text-3xl font-black text-white px-4 italic uppercase"
            >
              {team}
            </h3>
          ))}
          {/* Duplicate for seamless loop */}
          {teams.map((team, index) => (
            <h3
              key={`team-2-${index}`}
              className="text-3xl font-black text-white px-4 italic uppercase"
            >
              {team}
            </h3>
          ))}
        </div>
      </div>
    </section>
  );
}
