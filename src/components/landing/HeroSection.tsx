import Link from 'next/link';

export default function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden pt-20 pb-32">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 blur-[120px] rounded-full -z-10"></div>
      
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
        <div className="flex flex-col gap-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
            <span className="flex h-2 w-2 rounded-full bg-accent-teal"></span>
            <span className="text-xs font-medium text-white/80 uppercase tracking-widest">
              Novedad: Modo Táctico 2.0
            </span>
          </div>
          
          <h1 className="text-white text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
            Eleva el <span className="text-brand-gradient italic">rendimiento</span> de tu equipo
          </h1>
          
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed max-w-lg">
            La plataforma definitiva para la gestión profesional de equipos deportivos. 
            Centraliza entrenamientos, comunicación y estadísticas en un solo lugar.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link href="/auth/login">
              <button className="bg-brand-gradient text-white px-8 py-4 rounded-full text-lg font-bold brand-glow transition-all flex items-center gap-2">
                Comenzar ahora
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </Link>
            
            <button className="glass text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-white/10 transition-all">
              Ver Demo
            </button>
          </div>
        </div>
        
        <div className="relative flex justify-center lg:justify-end">
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl overflow-hidden glass max-w-2xl w-full">
            <div
              className="w-full bg-center bg-no-repeat aspect-[16/10] bg-cover rounded-xl"
              style={{
                backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDEKqO66Ce9oKr8Xm0wM_K9AJEa5jfIpjZW-ymimzk1Q_S81UJYPs1pfmZHzVU3h70NygkRPWe00iYkIRgPxXKcNDyHQ0npz08o8azF2TzrSenoJY3J1w9BoEB_iqBSmkBvLtqYi7lCABIm6q_NA_qvhm8X4SyJINhH37VNVfYaavCCT9QzO87BSkztHDLo81wf7iMAxisTA-qYYS0AISxoXOLqW7l3RlIoTvGE-GsgaVLReHK0tiHq-s_D2TXP4HZ-SYYkES_sI6s")'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
