export default function TrustedBySection() {
  const teams = [
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH',
    'WOLFPACK-SXH'
  ];

  return (
    <section className="py-12 border-y border-white/5 bg-white/[0.02]">
      <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mb-10">
        Confían en nuestra tecnología
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
