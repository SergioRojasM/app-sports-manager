import { LoginBenefitsPanel } from "@/components/auth/LoginBenefitsPanel";
import { LoginCard } from "@/components/auth/LoginCard";
import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawNext = resolvedSearchParams?.next;
  const nextPath = rawNext && rawNext.startsWith("/") ? rawNext : "/portal";

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row">
      <LoginBenefitsPanel />
      <LoginCard>
        <LoginForm nextPath={nextPath} />
      </LoginCard>
    </div>
  );
}
