import { GritIcon } from '@/components/ui';
import { getLandingUrl } from '@/lib/home/home.utils';

export function ClubCtaBand() {
  return (
    <section className="px-5 py-14 md:px-20 md:py-24">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-5 rounded-[20px] border border-grit-glass-border bg-[#0F1F30] bg-[linear-gradient(180deg,rgba(20,219,196,0.18),transparent_80%)] p-7 md:flex-row md:items-center md:justify-between md:bg-[linear-gradient(90deg,rgba(20,219,196,0.18),transparent_70%)] md:px-14 md:py-11">
        <div className="flex max-w-[720px] flex-col gap-2">
          <h2 className="font-grit-title text-[28px] font-bold italic leading-tight text-grit-text md:text-[34px]">
            ¿Tienes un club o equipo deportivo?
          </h2>
          <p className="font-grit-body text-[15px] leading-relaxed text-grit-subtext md:text-base">
            Gestiona atletas, entrenamientos, pagos y eventos en una sola plataforma.
          </p>
        </div>
        <a
          href={getLandingUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-grit-lg border-[1.5px] border-grit-cyan px-6 py-3.5 font-grit-title text-lg font-bold text-grit-cyan transition hover:bg-grit-cyan/10"
        >
          Conoce GRIT Arena
          <GritIcon name="north_east" size={18} />
        </a>
      </div>
    </section>
  );
}
