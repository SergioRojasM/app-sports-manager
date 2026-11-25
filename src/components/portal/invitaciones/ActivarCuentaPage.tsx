'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MIN_PASSWORD_LENGTH, useActivarCuenta } from '@/hooks/portal/invitaciones/useActivarCuenta';
import { GritPageHeader } from '@/components/ui';

type ActivarCuentaPageProps = {
  tenantId: string;
};

const inputClasses =
  'w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text placeholder:text-grit-muted outline-none focus:border-grit-cyan/50';

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
      <GritPageHeader
        title="Activa tu cuenta"
        subtitle="Tu organización creó tu cuenta con una contraseña temporal. Crea una nueva contraseña para activar tu membresía."
      />

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="border bg-grit-glass backdrop-blur-md mx-auto w-full max-w-md space-y-4 rounded-grit-2xl border-grit-glass-border p-6"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-grit-cyan/15">
          <span className="material-symbols-outlined text-2xl text-grit-cyan" aria-hidden="true">lock_reset</span>
        </div>

        <div>
          <label htmlFor="ac-password" className="mb-1 block text-xs font-medium text-grit-subtext">
            Nueva contraseña <span className="text-grit-danger">*</span>
          </label>
          <input
            id="ac-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClasses}
          />
          <p className="mt-1 text-[11px] text-grit-muted">Mínimo {MIN_PASSWORD_LENGTH} caracteres.</p>
        </div>

        <div>
          <label htmlFor="ac-confirmacion" className="mb-1 block text-xs font-medium text-grit-subtext">
            Confirmar contraseña <span className="text-grit-danger">*</span>
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
          <div className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3" role="alert">
            <p className="text-xs text-grit-danger">{error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !password || !confirmacion}
          className="w-full rounded-grit-md bg-grit-cyan px-4 py-2.5 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Activando…' : 'Activar cuenta'}
        </button>
      </form>
    </section>
  );
}
