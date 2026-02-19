import { LoginBenefitsPanel } from "@/components/auth/LoginBenefitsPanel";
import { LoginCard } from "@/components/auth/LoginCard";
import { SignupForm } from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row">
      <LoginBenefitsPanel />
      <LoginCard>
        <SignupForm />
      </LoginCard>
    </div>
  );
}
