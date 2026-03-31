import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import { LoginBenefitsPanel } from "@/components/auth/LoginBenefitsPanel";
import { LoginCard } from "@/components/auth/LoginCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";

export default async function UpdatePasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    redirect("/auth/forgot-password");
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-navy-deep md:flex-row">
      <LoginBenefitsPanel />
      <LoginCard>
        <UpdatePasswordForm />
      </LoginCard>
    </div>
  );
}
