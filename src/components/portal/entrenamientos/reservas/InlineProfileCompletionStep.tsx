'use client';

import { useEffect, useMemo, type ReactNode } from 'react';
import { usePerfil } from '@/hooks/portal/perfil/usePerfil';
import { PerfilPersonalForm } from '@/components/portal/perfil/PerfilPersonalForm';
import { PerfilDeportivoForm } from '@/components/portal/perfil/PerfilDeportivoForm';
import type { FormularioPerfilCampo } from '@/types/portal/formularios.types';

type InlineProfileCompletionStepProps = {
  /** Only the profile fields the current training's formulario requires and is missing. */
  missingFields: FormularioPerfilCampo[];
  /** Called once the save succeeds, so the caller can re-check profile completeness. */
  onSaved: () => void;
  onClose: () => void;
  headerExtra?: ReactNode;
};

/**
 * Replaces the old "open /portal/perfil in a new tab" detour: reuses usePerfil() as-is for
 * fetch/validate/save, but renders only the missing fields inline inside the booking modal.
 */
export function InlineProfileCompletionStep({
  missingFields,
  onSaved,
  onClose,
  headerExtra,
}: InlineProfileCompletionStepProps) {
  const perfil = usePerfil();

  // usePerfil().submit() unconditionally requires nombre/apellido (same rule as the full
  // /portal/perfil page) regardless of what this training's formulario asked for — and
  // SignupForm never collects them, so a just-signed-up user always has them empty. If
  // they aren't already part of `missingFields`, force them visible too: otherwise
  // submit() fails validation on a field the user can't see, and "Guardar y continuar"
  // silently does nothing forever.
  const visibleFields = useMemo(() => {
    const fields = new Set<FormularioPerfilCampo>(missingFields);
    if (!perfil.formValues.nombre.trim()) fields.add('nombre');
    if (!perfil.formValues.apellido.trim()) fields.add('apellido');
    return Array.from(fields);
  }, [missingFields, perfil.formValues.nombre, perfil.formValues.apellido]);

  useEffect(() => {
    if (perfil.successMessage) {
      onSaved();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.successMessage]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await perfil.submit();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-grit-bg/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Completa tus datos"
    >
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-grit-2xl border border-grit-glass-border bg-grit-card p-6 shadow-2xl">
        <h2 className="font-grit-title mb-1 text-lg font-semibold text-grit-text">Completa tus datos</h2>
        <p className="mb-4 text-sm text-grit-subtext">
          Este entrenamiento requiere algunos datos de tu perfil que aún no tienes registrados.
        </p>

        {headerExtra}

        {perfil.error && (
          <div className="mb-4 rounded-grit-md border border-grit-danger/40 bg-rose-500/15 px-4 py-3 text-sm text-grit-danger">
            {perfil.error}
          </div>
        )}

        {perfil.loading ? (
          <p className="text-sm text-grit-subtext">Cargando tu perfil…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              <PerfilPersonalForm
                formValues={perfil.formValues}
                fieldErrors={perfil.fieldErrors}
                email={perfil.email}
                updateField={perfil.updateField}
                visibleFields={visibleFields}
              />
              <PerfilDeportivoForm
                formValues={perfil.formValues}
                fieldErrors={perfil.fieldErrors}
                updateField={perfil.updateField}
                visibleFields={visibleFields}
              />
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-3 border-t border-grit-glass-border pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={perfil.isSubmitting}
                className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-medium text-grit-subtext hover:bg-grit-cyan/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={perfil.isSubmitting}
                className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg hover:bg-grit-cyan/90 disabled:opacity-50"
              >
                {perfil.isSubmitting ? 'Guardando...' : 'Guardar y continuar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
