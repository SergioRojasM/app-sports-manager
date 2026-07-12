import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import TrustedBySection from '@/components/landing/TrustedBySection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="landing-shell selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <PricingSection />
      <Footer />
    </div>
  );
}


