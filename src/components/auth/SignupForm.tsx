"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";

export function SignupForm() {
  const router = useRouter();
  const { signUp, errorMessage: authErrorMessage } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    const result = await signUp({ email, password });

    if (result.errorMessage) {
      setLoading(false);
      return;
    }

    if (result.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setSuccessMessage("Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.");
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6 text-center md:text-left">
        <div className="mb-4 flex justify-center md:justify-start">
          <div className="relative h-14 w-14">
            <Image src="/logo2.png" alt="Logo de Qbop Sports Manager" fill className="object-contain" />
          </div>
        </div>
        <h2 className="mb-2 text-3xl font-bold text-slate-100">
          Crea tu <span className="text-turquoise">cuenta</span>
        </h2>
        <p className="text-sm text-slate-400">Únete a qbop training y empieza a optimizar el rendimiento de tu equipo.</p>
      </div>

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
            placeholder="coach@qboptraining.com"
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

      <p className="text-center text-sm text-slate-400">
        ¿Ya tienes una cuenta?
        <Link
          className="ml-1 font-semibold text-turquoise decoration-2 underline-offset-4 hover:underline"
          href="/auth/login"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}
