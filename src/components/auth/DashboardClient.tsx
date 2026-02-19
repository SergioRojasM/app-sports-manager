"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/supabase/auth";

type DashboardClientProps = {
  userEmail: string | null;
};

export function DashboardClient({ userEmail }: DashboardClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setLoading(true);
    setErrorMessage(null);

    const error = await authService.signOut();
    setLoading(false);

    if (error) {
      setErrorMessage(error);
      return;
    }

    router.push("/auth/login");
    router.refresh();
  };

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Protected Dashboard
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Welcome{userEmail ? `, ${userEmail}` : ""}
          </h1>
        </div>
        <p className="text-slate-600">
          You are signed in and can access protected content.
        </p>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div>
          <button
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            type="button"
            onClick={handleSignOut}
            disabled={loading}
          >
            {loading ? "Signing out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}
