"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import { GUIDED_LOGIN_STEPS, parseGuidedParams } from "@/lib/portal/entrenamientos-publicos/guidedBooking";
import { GuidedBookingStepper } from "@/components/ui/GuidedBookingStepper";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, errorMessage } = useAuth();

  const guidedTarget = useMemo(() => parseGuidedParams(nextPath), [nextPath]);
  const signupHref = `/auth/signup?next=${encodeURIComponent(nextPath)}`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetBannerVisible, setResetBannerVisible] = useState(
    searchParams.get("reset") === "success"
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const result = await signIn({ email, password });

    if (!result.errorMessage && (result.session || result.user)) {
      router.push(nextPath);
      router.refresh();
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle(nextPath);
    if (result.errorMessage) {
      setGoogleLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 text-center md:text-left">
        <div className="mb-8 flex justify-center md:justify-start">
          <div className="relative h-10 w-40">
            <Image src="/logo-navbar.png" alt="Logo de GRIT Arena" fill className="object-contain" />
          </div>
        </div>
        <h2 className="mb-2 text-3xl font-bold text-slate-100">
          Inicia sesión en tu <span className="text-turquoise">cuenta</span>
        </h2>
        <p className="text-sm text-slate-400">¡Bienvenido de nuevo! Ingresa tus datos.</p>
      </div>

      {guidedTarget && (
        <GuidedBookingStepper steps={GUIDED_LOGIN_STEPS} currentStep={1} trainingNombre={guidedTarget.nombre} />
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {resetBannerVisible && (
          <div
            className="rounded-lg border border-turquoise/40 bg-turquoise/10 px-4 py-3 text-sm text-turquoise"
            role="status"
          >
            Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña.
          </div>
        )}

        {errorMessage && (
          <div
            className="rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="email">
            Correo electrónico
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-500">
              mail
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-navy-deep py-3 pr-4 pl-12 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
              id="email"
              name="email"
              placeholder="coach@gmail.com"
              required
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setResetBannerVisible(false);
              }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="password">
            Contraseña
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-500">
              lock
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-navy-deep py-3 pr-4 pl-12 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
              id="password"
              name="password"
              placeholder="••••••••"
              required
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setResetBannerVisible(false);
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <label className="group flex cursor-pointer items-center gap-2">
            <input
              checked={rememberMe}
              type="checkbox"
              className="rounded border-slate-700 bg-navy-deep text-turquoise focus:ring-turquoise"
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span className="text-sm text-slate-300 transition-colors group-hover:text-turquoise">
              Recuérdame
            </span>
          </label>

          <Link
            className="text-sm font-medium text-turquoise transition-colors hover:text-turquoise/80"
            href="/auth/forgot-password"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise py-3.5 font-bold text-navy-deep shadow-lg shadow-turquoise/10 transition-all hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-navy-soft px-4 text-turquoise">O continúa con</span>
        </div>
      </div>

      <button
        aria-label="Continuar con Google"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-navy-deep py-3 font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={googleLoading}
        onClick={handleGoogleSignIn}
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 48 48">
          <path
            d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            fill="#FFC107"
          />
          <path
            d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            fill="#FF3D00"
          />
          <path
            d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            fill="#4CAF50"
          />
          <path
            d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            fill="#1976D2"
          />
        </svg>
        {googleLoading ? "Redirigiendo..." : "Continuar con Google"}
      </button>

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿No tienes una cuenta?
        <Link
          className="ml-1 font-semibold text-turquoise decoration-2 underline-offset-4 hover:underline"
          href={signupHref}
        >
          Regístrate
        </Link>
      </p>
    </div>
  );
}
