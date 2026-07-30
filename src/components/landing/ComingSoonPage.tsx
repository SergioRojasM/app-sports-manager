import Link from 'next/link';
import Header from '@/components/landing/Header';

type ComingSoonPageProps = {
  title: string;
  description: string;
};

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="landing-shell min-h-screen selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 pt-28 pb-10 sm:pt-32 md:px-8 lg:px-10 lg:pt-36">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1 font-landing-body text-sm font-semibold text-landing-text-secondary transition hover:text-landing-primary"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            arrow_back
          </span>
          Volver al inicio
        </Link>

        <div>
          <h1 className="font-landing-display text-3xl font-bold italic text-landing-text sm:text-4xl">
            {title}
          </h1>
          <p className="mt-2 font-landing-body text-sm text-landing-text-secondary sm:text-base">
            {description}
          </p>
        </div>

        <p className="landing-panel w-fit rounded-full px-5 py-2 font-landing-body text-sm text-landing-text-secondary">
          Módulo en construcción. Muy pronto disponible.
        </p>
      </div>
    </div>
  );
}
