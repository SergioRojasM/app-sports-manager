'use client';

import { ERROR_KEYS } from '@/lib/portal/eventos-wizard.utils';
import { EventoEntradasEditor } from './EventoEntradasEditor';
import { EventoFormularioSelector } from './EventoFormularioSelector';
import { WizardSection } from './fields';
import type { EventoWizardState } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import type { EventoWizardOptions } from '@/hooks/portal/gestion-eventos/useEventoWizardOptions';

type EventoEntradasStepProps = {
  wizard: EventoWizardState;
  options: EventoWizardOptions;
  disabled: boolean;
};

export function EventoEntradasStep({ wizard, options, disabled }: EventoEntradasStepProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <WizardSection
        title="Tipos de entrada"
        icon="confirmation_number"
        description="Sencilla: acceso a este evento. Múltiple: acceso a este evento y a otros eventos del equipo."
      >
        <EventoEntradasEditor wizard={wizard} eventos={options.eventos} disabled={disabled} />
      </WizardSection>

      <WizardSection title="Formulario de acceso" icon="assignment">
        <EventoFormularioSelector
          tenantId={wizard.tenantId}
          formularios={options.formularios}
          value={wizard.draft.formularioId}
          error={wizard.errors[ERROR_KEYS.formularioId]}
          disabled={disabled}
          onChange={(value) => wizard.updateField('formularioId', value)}
        />
      </WizardSection>
    </div>
  );
}
