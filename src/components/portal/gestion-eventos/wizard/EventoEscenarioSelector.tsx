'use client';

import { useCallback } from 'react';
import { ScenarioFormModal } from '@/components/portal/scenarios/ScenarioFormModal';
import { useScenarios } from '@/hooks/portal/scenarios/useScenarios';
import { BodyPortal } from '../EventoModalShell';
import { toEscenarioSnapshot } from '@/lib/portal/eventos-wizard.utils';
import { Field, SelectShell, fieldA11y, selectClass } from './fields';
import type { Scenario } from '@/types/portal/scenarios.types';
import type { EventoEscenarioSnapshot } from '@/types/portal/eventos.types';

const NONE = '__none__';
const CREATE = '__create__';

type EventoEscenarioSelectorProps = {
  tenantId: string;
  value: EventoEscenarioSnapshot | null;
  onChange: (value: EventoEscenarioSnapshot | null) => void;
  disabled?: boolean;
};

/** Active scenarios + "Sin escenario" + inline creation through the existing ScenarioFormModal (US-0119). */
export function EventoEscenarioSelector({ tenantId, value, onChange, disabled }: EventoEscenarioSelectorProps) {
  // Auto-select the scenario created from the inline modal
  const handleCreated = useCallback((scenario: Scenario) => onChange(toEscenarioSnapshot(scenario)), [onChange]);

  const scenarios = useScenarios({ tenantId, onCreated: handleCreated });
  const activos = scenarios.scenarios.filter((scenario) => scenario.activo);
  const isStale = value !== null && !activos.some((scenario) => scenario.id === value.id);
  const errorKey = 'escenario';

  const handleSelect = (selected: string) => {
    if (selected === CREATE) {
      // The select keeps showing the previous value; cancelling the modal changes nothing
      scenarios.openCreateModal();
      return;
    }
    if (selected === NONE) {
      onChange(null);
      return;
    }
    if (value && selected === value.id) return;
    const scenario = activos.find((item) => item.id === selected);
    if (scenario) onChange(toEscenarioSnapshot(scenario));
  };

  return (
    <>
      <Field
        errorKey={errorKey}
        label="Escenario"
        hint={scenarios.error ?? (scenarios.loading ? 'Cargando escenarios…' : 'Se guarda una copia del escenario en el evento.')}
      >
        <SelectShell>
          <select
            {...fieldA11y(errorKey, undefined)}
            value={value?.id ?? NONE}
            onChange={(event) => handleSelect(event.target.value)}
            disabled={disabled || scenarios.loading}
            className={selectClass()}
          >
            <option value={NONE}>Sin escenario</option>
            {isStale && value && <option value={value.id}>{value.nombre} (guardado en el evento)</option>}
            {activos.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.ubicacion ? `${scenario.nombre} · ${scenario.ubicacion}` : scenario.nombre}
              </option>
            ))}
            <option value={CREATE}>+ Crear nuevo escenario</option>
          </select>
        </SelectShell>
      </Field>

      <BodyPortal>
        <ScenarioFormModal
          open={scenarios.modalOpen}
          mode="create"
          isSubmitting={scenarios.isSubmitting}
          values={scenarios.formValues}
          fieldErrors={scenarios.fieldErrors}
          scheduleErrors={scenarios.scheduleErrors}
          submitError={scenarios.submitError}
          onClose={scenarios.closeModal}
          onSubmit={scenarios.submit}
          onChangeField={scenarios.updateField}
          onAddSchedule={scenarios.addSchedule}
          onRemoveSchedule={scenarios.removeSchedule}
          onChangeScheduleField={scenarios.updateScheduleField}
        />
      </BodyPortal>
    </>
  );
}
