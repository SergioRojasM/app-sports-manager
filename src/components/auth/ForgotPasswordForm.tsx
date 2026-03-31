"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/hooks/auth/useAuth";

export function ForgotPasswordForm() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const result = await resetPassword(email);

    setLoading(false);

    if (result.errorMessage) {
      setErrorMessage(result.errorMessage);
      return;
    }

    setSent(true);
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
          ¿Olvidaste tu <span className="text-turquoise">contraseña?</span>
        </h2>
        <p className="text-sm text-slate-400">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
        </p>
      </div>

      {sent ? (
        <div
          className="rounded-lg border border-turquoise/40 bg-turquoise/10 px-4 py-4 text-sm text-turquoise"
          role="status"
        >
          <p className="font-semibold">Revisa tu correo electrónico.</p>
          <p className="mt-1 text-turquoise/80">
            Te enviamos un enlace para restablecer tu contraseña. Si no lo ves, revisa la carpeta de spam.
          </p>
        </div>
      ) : (
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

          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-turquoise py-3.5 font-bold text-navy-deep shadow-lg shadow-turquoise/10 transition-all hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? "Enviando enlace..." : "Enviar enlace de restablecimiento"}
            <span className="material-symbols-outlined text-xl">arrow_forward</span>
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        ¿Recordaste tu contraseña?
        <Link
          className="ml-1 font-semibold text-turquoise decoration-2 underline-offset-4 hover:underline"
          href="/auth/login"
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
