"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const { signIn, signUp, errorMessage } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccessMessage(null);

    const action = mode === "signup" ? signUp : signIn;
    const result = await action({ email, password });

    if (!result.errorMessage) {
      if (result.session || result.user) {
        router.push(nextPath);
        router.refresh();
      } else if (mode === "signup") {
        setSuccessMessage("Check your email to confirm your account.");
      }
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center mb-10">
        <div className="w-12 h-12 bg-[#ea2a33] flex items-center justify-center rounded-xl shadow-lg mb-4">
          <span className="text-white text-2xl font-bold">A</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 mt-2">
          Please enter your details to sign in.
        </p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-xl border border-gray-100">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="email"
            >
              Email Address
            </label>
            <input
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea2a33]/20 focus:border-[#ea2a33] outline-none transition-all"
              id="email"
              name="email"
              placeholder="name@company.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#ea2a33]/20 focus:border-[#ea2a33] outline-none transition-all"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button
            className="w-full bg-[#ea2a33] hover:bg-[#d9252e] text-white font-semibold py-3 rounded-lg shadow-md shadow-[#ea2a33]/20 transition-all active:scale-[0.98]"
            type="submit"
            disabled={loading}
          >
            {loading
              ? mode === "signup"
                ? "Creating account..."
                : "Signing in..."
              : mode === "signup"
              ? "Create account"
              : "Log in"}
          </button>
        </form>
      </div>

      <p className="text-center mt-8 text-sm text-gray-600">
        {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          className="font-semibold text-[#ea2a33] hover:underline underline-offset-4 decoration-2"
          onClick={() =>
            setMode((current) => (current === "signup" ? "signin" : "signup"))
          }
        >
          {mode === "signup" ? "Sign in" : "Sign up for free"}
        </button>
      </p>
    </div>
  );
}
