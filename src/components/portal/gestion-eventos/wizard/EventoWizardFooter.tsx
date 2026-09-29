'use client';

import { GritButton, GritIcon } from '@/components/ui';
import type { EventoWizardSavingKind } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import type { EventoWizardStep } from '@/types/portal/eventos.types';

type EventoWizardFooterProps = {
  step: EventoWizardStep;
  /** True for a published event (primary = "Guardar cambios" on every step, no draft button). */
  publicado: boolean;
  mostrarGuardarBorrador: boolean;
  canGuardarBorrador: boolean;
  nombreVacio: boolean;
  isDirty: boolean;
  savingKind: EventoWizardSavingKind;
  borradorGuardadoFlash: boolean;
  saveError: string | null;
  disabled: boolean;
  onBack: () => void;
  onNext: () => void;
  onGuardarBorrador: () => void;
  onGuardarFinal: () => void;
};

const BORRADOR_HINT_ID = 'evento-guardar-borrador-hint';

export function EventoWizardFooter({
  step,
  publicado,
  mostrarGuardarBorrador,
  canGuardarBorrador,
  nombreVacio,
  isDirty,
  savingKind,
  borradorGuardadoFlash,
  saveError,
  disabled,
  onBack,
  onNext,
  onGuardarBorrador,
  onGuardarFinal,
}: EventoWizardFooterProps) {
  const isSaving = savingKind !== null;
  const showFinal = publicado || step === 3;

  return (
    <div className="sticky bottom-0 z-20 -mx-1 space-y-2 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/90 p-3 shadow-[0_-12px_32px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-4">
      {saveError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 font-grit-body text-sm text-grit-danger"
        >
          <GritIcon name="error" size={18} className="mt-0.5 shrink-0" />
          {saveError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {step > 1 && (
            <GritButton variant="ghost" size="sm" icon="arrow_back" onClick={onBack} disabled={disabled || isSaving}>
              Atrás
            </GritButton>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <span role="status" aria-live="polite" className="font-grit-body text-xs text-grit-success">
            {borradorGuardadoFlash && savingKind === null ? 'Borrador guardado' : ''}
          </span>

          {mostrarGuardarBorrador && (
            <>
              <GritButton
                variant="secondary"
                size="sm"
                icon="save"
                onClick={onGuardarBorrador}
                disabled={disabled || !canGuardarBorrador}
                loading={savingKind === 'borrador'}
                loadingLabel="Guardando…"
                aria-describedby={nombreVacio ? BORRADOR_HINT_ID : undefined}
                title={nombreVacio ? 'Escribe el nombre del evento para guardar' : undefined}
              >
                {!isDirty && !nombreVacio ? 'Borrador guardado' : 'Guardar borrador'}
              </GritButton>
              {nombreVacio && (
                <span id={BORRADOR_HINT_ID} className="sr-only">
                  Escribe el nombre del evento para guardar
                </span>
              )}
            </>
          )}

          {step < 3 && (
            <GritButton
              variant={showFinal ? 'outline-accent' : 'primary'}
              size="sm"
              icon="arrow_forward"
              iconPosition="end"
              onClick={onNext}
              disabled={disabled || isSaving}
            >
              Siguiente
            </GritButton>
          )}

          {showFinal && (
            <GritButton
              size="sm"
              icon={publicado ? 'save' : 'publish'}
              onClick={onGuardarFinal}
              disabled={disabled || (isSaving && savingKind !== 'final')}
              loading={savingKind === 'final'}
              loadingLabel="Guardando…"
            >
              {publicado ? 'Guardar cambios' : 'Publicar evento'}
            </GritButton>
          )}
        </div>
      </div>
    </div>
  );
}
