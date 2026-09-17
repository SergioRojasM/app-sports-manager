'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MIN_PASSWORD_LENGTH, useActivarCuenta } from '@/hooks/portal/invitaciones/useActivarCuenta';

type ActivarCuentaPageProps = {
  tenantId: string;
};

const inputClasses =
  'w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-turquoise/50';

export function ActivarCuentaPage({ tenantId }: ActivarCuentaPageProps) {
  const router = useRouter();
  const { isSubmitting, error, activar } = useActivarCuenta(tenantId);
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await activar(password, confirmacion);
    if (ok) {
      router.push(`/portal/orgs/${tenantId}`);
      router.refresh();
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Activa tu cuenta</h1>
        <p className="mt-2 text-sm text-slate-400">
          Tu organización creó tu cuenta con una contraseña temporal. Crea una nueva contraseña para activar tu membresía.
        </p>
      </header>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="glass mx-auto w-full max-w-md space-y-4 rounded-2xl border border-portal-border p-6"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-turquoise/15">
          <span className="material-symbols-outlined text-2xl text-turquoise" aria-hidden="true">lock_reset</span>
        </div>

        <div>
          <label htmlFor="ac-password" className="mb-1 block text-xs font-medium text-slate-300">
            Nueva contraseña <span className="text-rose-400">*</span>
          </label>
          <input
            id="ac-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
          />
          <p className="mt-1 text-[11px] text-slate-500">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
        </div>

        <div>
          <label htmlFor="ac-confirmacion" className="mb-1 block text-xs font-medium text-slate-300">
            Confirmar contraseña <span className="text-rose-400">*</span>
          </label>
          <input
            id="ac-confirmacion"
            type="password"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            className={inputClasses}
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 p-3" role="alert">
            <p className="text-xs text-rose-200">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !password || !confirmacion}
          className="w-full rounded-lg bg-turquoise px-4 py-2.5 text-sm font-bold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Activando…' : 'Activar cuenta'}
        </button>
      </form>
    </section>
  );
}
