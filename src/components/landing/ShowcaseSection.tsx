export default function ShowcaseSection() {
  return (
    <section className="py-24 bg-white/[0.02]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Análisis Predictivo - Large Card */}
          <div className="col-span-12 lg:col-span-8 h-[400px] glass rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10 max-w-sm">
              <h4 className="text-white text-2xl font-black mb-2">Análisis Predictivo</h4>
              <p className="text-slate-400">
                Algoritmos de IA que predicen la fatiga y el riesgo de lesiones de tus atletas.
              </p>
            </div>
            <div
              className="absolute bottom-0 right-0 w-[60%] h-[80%] bg-center bg-cover rounded-tl-3xl border-t border-l border-white/10"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDoMqpjYhE0EKIGJudqHdLJbij6Ja8t0qdXyWPTBPGaRZyIUMmMHjAG-yOWq0A9hg4ukAvXNqlRQgkz8qG0DKnj7KrZrIvZ7aENMjN4TmcQWMxfZvUD5whpTneOTJXkZsRSdgD6Tv-y8wHapQWTb5jhBnP7dOX5lWCyY4XMpwvJ7N71PkXtc7NNwqmlABm-7GI29k498S3jeXZOdIQhve5eF0rAe70g04g-Vzy6yw9bgHRyZ_vvLSBzsRk7RcJ6e_Xxbck9r12ohmc")'
              }}
            />
          </div>

          {/* Perfiles Pro - Medium Card with Brand Gradient */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 h-[400px] bg-brand-gradient rounded-3xl p-8 relative overflow-hidden">
            <h4 className="text-white text-2xl font-black mb-2 italic">Perfiles Pro</h4>
            <p className="text-white/80 mb-8">Fichas técnicas completas por cada jugador.</p>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <div className="size-10 rounded-full bg-slate-300"></div>
                <div>
                  <p className="text-white font-bold text-sm">Marc Stephens</p>
                  <p className="text-white/60 text-xs">Delantero • Nivel 92</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white/20 p-3 rounded-2xl backdrop-blur-md opacity-60 scale-95 translate-x-4">
                <div className="size-10 rounded-full bg-slate-300"></div>
                <div>
                  <p className="text-white font-bold text-sm">Elena Rodriguez</p>
                  <p className="text-white/60 text-xs">Defensa • Nivel 88</p>
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined absolute bottom-[-40px] right-[-20px] text-[180px] text-white/10 select-none">
              person
            </span>
          </div>

          {/* Pizarra Táctica - Small Card */}
          <div className="col-span-12 md:col-span-6 lg:col-span-4 h-[300px] glass rounded-3xl p-8 overflow-hidden group">
            <div className="size-10 rounded-full bg-accent-teal/20 flex items-center justify-center text-accent-teal mb-4">
              <span className="material-symbols-outlined">tactic</span>
            </div>
            <h4 className="text-white text-xl font-bold mb-2">Pizarra Táctica</h4>
            <p className="text-slate-400 text-sm">
              Diseña jugadas en tiempo real y compártelas con el equipo.
            </p>
            <div className="mt-6 border-2 border-white/5 rounded-xl h-24 bg-blue-900/30 flex items-center justify-center">
              <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:10px_10px]"></div>
            </div>
          </div>

          {/* Red Global de Scouting - Large Card */}
          <div className="col-span-12 lg:col-span-8 h-[300px] bg-card-dark rounded-3xl p-8 flex items-center gap-10 overflow-hidden relative border border-white/5">
            <div className="flex-1">
              <h4 className="text-white text-2xl font-black mb-2">Red Global de Scouting</h4>
              <p className="text-slate-400">
                Conecta con ojeadores internacionales y exporta reportes de rendimiento certificados.
              </p>
              <div className="mt-6 flex gap-2">
                <div className="size-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px]">
                  US
                </div>
                <div className="size-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px]">
                  ES
                </div>
                <div className="size-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[10px]">
                  UK
                </div>
                <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px]">
                  +40
                </div>
              </div>
            </div>
            <div
              className="hidden md:block w-1/2 h-full bg-center bg-cover opacity-50 absolute right-0 top-0"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBgzrf10DRV4U-CFa81O9T96ugy5_hAILdHxAmTL6cSOqs34kj10eFT5tOTy13tlnRiDhO0lcDH-bm_RopNSMoGjtymZ2OFFkH_eyE4PJY76VxzhJHHX78Q6twQKTAce1mOJ5Z0vqFbEnQauWh8DCtd1PeL-W0QTxIzSYsYRhjBESnFrQMJQ4kzNrL_N6fg92TVpqHV0iCbx7At08aHtCxA42XsSk4jL8WpOcF6hhJsU__dvmhpplhU4CKoDejA4FHYhKvWZBFvSIc")'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
