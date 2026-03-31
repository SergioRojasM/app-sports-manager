import { LoginBenefitsPanel } from "@/components/auth/LoginBenefitsPanel";
import { LoginCard } from "@/components/auth/LoginCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row">
      <LoginBenefitsPanel />
      <LoginCard>
        <ForgotPasswordForm />
      </LoginCard>
    </div>
  );
}
