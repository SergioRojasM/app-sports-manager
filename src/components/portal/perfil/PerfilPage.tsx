'use client';

import { usePerfil } from '@/hooks/portal/perfil/usePerfil';
import { PerfilHeader } from './PerfilHeader';
import { PerfilPersonalForm } from './PerfilPersonalForm';
import { PerfilDeportivoForm } from './PerfilDeportivoForm';

export function PerfilPage() {
  const {
    loading,
    error,
    email,
    fotoUrl,
    formValues,
    fieldErrors,
    isSubmitting,
    isDirty,
    successMessage,
    updateField,
    cancel,
    submit,
    refresh,
  } = usePerfil();

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="glass rounded-xl border border-portal-border p-8 text-sm text-slate-300">
        Cargando perfil…
      </div>
    );
  }

  /* ── Error ── */
  if (error && !successMessage) {
    return (
      <div className="glass rounded-xl border border-red-500/30 bg-red-500/10 p-8">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <span className="material-symbols-outlined text-base">check_circle</span>
          {successMessage}
        </div>
      )}

      {/* Submit error (when data is already loaded) */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span className="material-symbols-outlined text-base">error</span>
          {error}
        </div>
      )}

      {/* Main card */}
      <div className="glass rounded-xl border border-portal-border p-6 shadow-2xl">
        <div className="space-y-8">
          {/* Header: avatar + name + save/cancel */}
          <PerfilHeader
            formValues={formValues}
            fotoUrl={fotoUrl}
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            onSave={submit}
            onCancel={cancel}
          />

          <hr className="border-portal-border" />

          {/* Personal information */}
          <PerfilPersonalForm
            formValues={formValues}
            fieldErrors={fieldErrors}
            email={email}
            updateField={updateField}
          />

          <hr className="border-portal-border" />

          {/* Sports profile */}
          <PerfilDeportivoForm
            formValues={formValues}
            fieldErrors={fieldErrors}
            updateField={updateField}
          />
        </div>
      </div>
    </div>
  );
}
