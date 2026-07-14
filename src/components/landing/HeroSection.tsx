import Image from 'next/image';
import HeroValueProps from '@/components/landing/HeroValueProps';

const demoWhatsappUrl =
  'https://wa.me/573224399865?text=Hola%2C%20quiero%20solicitar%20una%20demo%20de%20GRIT%20Arena%20para%20mi%20club%20deportivo.';

export default function HeroSection() {
  return (
    <section id="hero" className="relative overflow-hidden pb-16 pt-24 sm:pt-28 lg:pb-20 lg:pt-32">
      <div className="absolute inset-0">
        <Image
          src="/landing/landing-hero-background.png"
          alt="Athletes training in a high-performance environment"
          fill
          priority
          className="object-cover object-[56%_center] brightness-[1.22] contrast-[1.08] saturate-[0.92] lg:object-[52%_center]"
          sizes="100vw"
        />
        <div className="landing-hero-overlay absolute inset-0" />
        <div className="landing-hero-glow absolute -left-24 top-28 h-[420px] w-[420px] rounded-full blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-[rgba(7,17,31,0.58)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[680px] w-full max-w-[1280px] flex-col justify-center gap-8 px-5 sm:min-h-[700px] sm:px-8 lg:min-h-[780px] lg:gap-10 lg:px-10">
        <div className="max-w-[680px]">
          <p className="font-landing-display text-sm font-semibold uppercase tracking-[0.28em] text-landing-primary-light">
            Plataforma de gestión para clubes y organizaciones deportivas
          </p>

          <h1 className="font-landing-display mt-6 text-[52px] font-bold italic leading-[0.95] tracking-[-0.02em] text-landing-text sm:text-[64px] lg:text-[72px]">
            Gestiona todo tu club deportivo desde una sola plataforma
          </h1>

          <div className="landing-divider mt-8" />

          <p className="font-landing-body mt-8 max-w-[620px] text-base leading-8 text-landing-text-secondary sm:text-lg sm:leading-8">
            Centraliza atletas, entrenadores, entrenamientos, reservas, pagos, planes y reportes en un sistema diseñado para ordenar tu operación y ayudarte a crecer con más control.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
            <a
              href={demoWhatsappUrl}
              rel="noreferrer"
              target="_blank"
              className="landing-primary-button font-landing-display inline-flex items-center justify-center gap-2 px-6 py-4 text-lg font-bold tracking-[0.04em] sm:px-8"
            >
              Solicita una demo
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </a>

            <a
              href="#operacion"
              className="landing-secondary-button font-landing-display inline-flex items-center justify-center px-6 py-4 text-lg font-bold tracking-[0.04em] sm:px-8"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        <div className="mt-8 lg:mt-10">
          <HeroValueProps />
        </div>
      </div>
    </section>
  );
}
