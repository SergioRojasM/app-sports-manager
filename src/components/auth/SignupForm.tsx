"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { GUIDED_SIGNUP_STEPS, parseGuidedParams } from "@/lib/portal/entrenamientos-publicos/guidedBooking";
import { GuidedBookingStepper } from "@/components/ui/GuidedBookingStepper";

type SignupFormProps = {
  nextPath?: string;
};

export function SignupForm({ nextPath }: SignupFormProps) {
  const router = useRouter();
  const { signUp, signInWithGoogle, errorMessage: authErrorMessage } = useAuth();

  const guidedTarget = useMemo(() => (nextPath ? parseGuidedParams(nextPath) : null), [nextPath]);
  const loginHref = nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const errorMessage = useMemo(
    () => formErrorMessage ?? authErrorMessage,
    [authErrorMessage, formErrorMessage]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password || !confirmPassword) {
      setFormErrorMessage("Por favor completa todos los campos requeridos.");
      return;
    }

    if (password !== confirmPassword) {
      setFormErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const result = await signUp({ email, password }, nextPath);

    if (result.errorMessage) {
      setLoading(false);
      return;
    }

    if (result.session) {
      router.push(nextPath ?? "/dashboard");
      router.refresh();
      return;
    }

    setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.");
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
          Crea tu <span className="text-turquoise">cuenta</span>
        </h2>
        <p className="text-sm text-slate-400">Únete a GRIT Arena y empieza a optimizar el rendimiento de tu equipo.</p>
      </div>

      {guidedTarget && (
        <GuidedBookingStepper
          steps={GUIDED_SIGNUP_STEPS}
          currentStep={successMessage ? 2 : 1}
          trainingNombre={guidedTarget.nombre}
        />
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
        {errorMessage && (
          <div
            className="rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            className="rounded-lg border border-emerald-500/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="email">
            Correo electrónico
          </label>
          <input
            className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
            id="email"
            name="email"
            placeholder="coach@training.com"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="password">
            Contraseña
          </label>
          <input
            className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
            id="password"
            name="password"
            placeholder="••••••••"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <input
            className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="••••••••"
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise py-3.5 font-bold text-navy-deep shadow-lg shadow-turquoise/10 transition-all hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={loading}
          type="submit"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
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
        ¿Ya tienes una cuenta?
        <Link
          className="ml-1 font-semibold text-turquoise decoration-2 underline-offset-4 hover:underline"
          href={loginHref}
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
