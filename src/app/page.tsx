import Header from '@/components/landing/Header';
import HeroSection from '@/components/landing/HeroSection';
import ProblemSolutionSection from '@/components/landing/ProblemSolutionSection';
import OperationSection from '@/components/landing/operation';
import AdministrationSection from '@/components/landing/administration';
import PricingSection from '@/components/landing/PricingSection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  return (
    <div className="landing-shell selection:bg-[var(--landing-primary)] selection:text-slate-950">
      <Header />
      <HeroSection />
      <ProblemSolutionSection />
      <OperationSection />
      <AdministrationSection />
      <PricingSection />
      <Footer />
    </div>
  );
}


