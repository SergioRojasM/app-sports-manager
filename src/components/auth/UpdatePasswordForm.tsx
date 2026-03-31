"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";

export function UpdatePasswordForm() {
  const router = useRouter();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  const errorMessage = useMemo(
    () => formErrorMessage ?? authErrorMessage,
    [formErrorMessage, authErrorMessage]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormErrorMessage(null);
    setAuthErrorMessage(null);

    if (!password || !confirmPassword) {
      setFormErrorMessage("Por favor completa todos los campos requeridos.");
      return;
    }

    if (password.length < 6) {
      setFormErrorMessage("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setFormErrorMessage("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.errorMessage) {
      setAuthErrorMessage(result.errorMessage);
      return;
    }

    router.push("/auth/login?reset=success");
  };

  return (
    <div>
      <div className="mb-6 text-center md:text-left">
        <div className="mb-4 flex justify-center md:justify-start">
          <div className="relative h-14 w-14">
            <Image src="/icono_2.png" alt="Logo de Qbop Sports Manager" fill className="object-contain" />
          </div>
        </div>
        <h2 className="mb-2 text-3xl font-bold text-slate-100">
          Crea tu nueva <span className="text-turquoise">contraseña</span>
        </h2>
        <p className="text-sm text-slate-400">
          Elige una contraseña segura de al menos 6 caracteres.
        </p>
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
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="password">
            Nueva contraseña
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

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-slate-300" htmlFor="confirmPassword">
            Confirmar contraseña
          </label>
          <div className="relative">
            <span className="material-symbols-outlined pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-slate-500">
              lock_reset
            </span>
            <input
              className="w-full rounded-xl border border-slate-700 bg-navy-deep py-3 pr-4 pl-12 text-slate-200 outline-none transition-all placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/40"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise py-3.5 font-bold text-navy-deep shadow-lg shadow-turquoise/10 transition-all hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Guardando contraseña..." : "Guardar nueva contraseña"}
          <span className="material-symbols-outlined text-xl">arrow_forward</span>
        </button>
      </form>
    </div>
  );
}
