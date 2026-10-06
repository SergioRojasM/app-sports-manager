'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePerfil } from '@/hooks/portal/perfil/usePerfil';
import type { FormularioPerfilCampo } from '@/types/portal/formularios.types';
import { GritPageHeader } from '@/components/ui';
import { PerfilPersonalForm } from './PerfilPersonalForm';

type CompletarPerfilPageProps = {
  tenantId: string;
  tenantNombre: string;
  /** Resolved on the server and fixed for the page's lifetime, so inputs don't vanish while typing. */
  missingFields: FormularioPerfilCampo[];
};

const cardClasses =
  'border bg-grit-glass backdrop-blur-md mx-auto w-full max-w-2xl rounded-grit-2xl border-grit-glass-border p-6';

export function CompletarPerfilPage({ tenantId, tenantNombre, missingFields }: CompletarPerfilPageProps) {
  const router = useRouter();
  const perfil = usePerfil({ requiredFields: missingFields });

  // usePerfil().submit() reports success only through successMessage.
  useEffect(() => {
    if (perfil.successMessage) {
      router.replace(`/portal/orgs/${tenantId}`);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.successMessage]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perfil.submit();
  }

  const volverLink = (
    <Link
      href="/portal/orgs"
      className="block text-center text-sm font-semibold text-grit-subtext transition hover:text-grit-text"
    >
      Volver a organizaciones
    </Link>
  );

  let content: React.ReactNode;

  if (perfil.loading) {
    content = <div className={`${cardClasses} text-center text-sm text-grit-subtext`}>Cargando tu perfil…</div>;
  } else if (perfil.error && !perfil.email) {
    // The profile never loaded: nothing to edit yet.
    content = (
      <div className={`${cardClasses} space-y-4 text-center`}>
        <p className="text-sm text-grit-danger" role="alert">
          {perfil.error}
        </p>
        <button
          type="button"
          onClick={() => void perfil.refresh()}
          className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90"
        >
          Reintentar
        </button>
        {volverLink}
      </div>
    );
  } else {
    content = (
      <form onSubmit={(event) => void handleSubmit(event)} noValidate className={`${cardClasses} space-y-5`}>
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-grit-cyan/15">
          <span className="material-symbols-outlined text-2xl text-grit-cyan" aria-hidden="true">
            badge
          </span>
        </div>

        <PerfilPersonalForm
          formValues={perfil.formValues}
          fieldErrors={perfil.fieldErrors}
          email={perfil.email}
          updateField={perfil.updateField}
          visibleFields={missingFields}
        />

        {perfil.error ? (
          <div className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 p-3" role="alert">
            <p className="text-xs text-grit-danger">{perfil.error}</p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={perfil.isSubmitting || Boolean(perfil.successMessage)}
          className="w-full rounded-grit-md bg-grit-cyan px-4 py-2.5 text-sm font-bold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
        >
          {perfil.isSubmitting || perfil.successMessage ? 'Guardando…' : 'Guardar y continuar'}
        </button>

        {volverLink}
      </form>
    );
  }

  return (
    <section className="space-y-6">
      <GritPageHeader
        title="Completa tu perfil"
        subtitle={`${tenantNombre} requiere que completes tu perfil para ingresar a la organización.`}
      />
      {content}
    </section>
  );
}
