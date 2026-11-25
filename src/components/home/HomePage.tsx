import { ClubCtaBand } from './ClubCtaBand';
import { EventosCintaSection } from './EventosCintaSection';
import { HomeFooter } from './HomeFooter';
import { HomeHeader } from './HomeHeader';
import { HomeHero } from './HomeHero';
import { OrganizacionesSection } from './OrganizacionesSection';

type HomePageProps = {
  isAuthenticated: boolean;
};

/** Public app home at `/` (US-0140). */
export function HomePage({ isAuthenticated }: HomePageProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-grit-bg font-grit-body text-grit-text selection:bg-grit-cyan selection:text-grit-bg">
      <HomeHeader isAuthenticated={isAuthenticated} />
      <main>
        <HomeHero isAuthenticated={isAuthenticated} />
        <EventosCintaSection />
        <OrganizacionesSection isAuthenticated={isAuthenticated} />
        <ClubCtaBand />
      </main>
      <HomeFooter />
    </div>
  );
}
