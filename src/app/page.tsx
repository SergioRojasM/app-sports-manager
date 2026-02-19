import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import TrustedBySection from '@/components/landing/TrustedBySection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import ShowcaseSection from '@/components/landing/ShowcaseSection';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 selection:bg-accent-teal selection:text-white">
      <Header />
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <ShowcaseSection />
      <PricingSection />
      <Footer />
    </div>
  );
}


