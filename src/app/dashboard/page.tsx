import { redirect } from "next/navigation";
import { createClient } from "@/services/supabase/server";
import { DashboardClient } from "@/components/auth/DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0f2223] text-slate-100 flex items-center justify-center p-6">
      <DashboardClient userEmail={user.email ?? null} />
    </div>
  );
}
