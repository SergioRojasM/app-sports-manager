"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const { signIn, errorMessage } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div>
      <div className="mb-6 text-center md:text-left">
        <div className="mb-4 flex justify-center md:justify-start">
          <div className="relative h-14 w-14">
            <Image src="/logo2.png" alt="Logo de Qbop Sports Manager" fill className="object-contain" />
          </div>
        </div>
        <h2 className="mb-2 text-3xl font-bold text-slate-100">
          Inicia sesión en tu <span className="text-turquoise">cuenta</span>
        </h2>
        <p className="text-sm text-slate-400">¡Bienvenido de nuevo! Ingresa tus datos.</p>
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
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setPassword(event.target.value)}
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

      <p className="text-center text-sm text-slate-400">
        ¿No tienes una cuenta?
        <Link
          className="ml-1 font-semibold text-turquoise decoration-2 underline-offset-4 hover:underline"
          href="/auth/signup"
        >
          Regístrate
        </Link>
      </p>
    </div>
  );
}
