import { LoginBenefitsPanel } from "@/components/auth/LoginBenefitsPanel";
import { LoginCard } from "@/components/auth/LoginCard";
import { SignupForm } from "@/components/auth/SignupForm";

type SignupPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawNext = resolvedSearchParams?.next;
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/dashboard";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row">
      <LoginBenefitsPanel />
      <LoginCard>
        <SignupForm nextPath={nextPath} />
      </LoginCard>
    </div>
  );
}
