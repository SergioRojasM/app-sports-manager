'use client';

import { GritButton } from '@/components/ui';
import { FormularioPreviewModal } from '@/components/portal/formularios/FormularioPreviewModal';
import { useFormularioPreview } from '@/hooks/portal/formularios/useFormularioPreview';
import { ERROR_KEYS } from '@/lib/portal/eventos-wizard.utils';
import { BodyPortal } from '../EventoModalShell';
import { Field, SelectShell, fieldA11y, selectClass } from './fields';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';

type EventoFormularioSelectorProps = {
  tenantId: string;
  formularios: FormularioPlantillaListItem[];
  value: string | null;
  error?: string;
  disabled?: boolean;
  onChange: (value: string | null) => void;
};

const NONE = '__none__';

/** Access form requested when buying any ticket of the event (US-0119). */
export function EventoFormularioSelector({ tenantId, formularios, value, error, disabled, onChange }: EventoFormularioSelectorProps) {
  const preview = useFormularioPreview();
  const isStale = value !== null && !formularios.some((plantilla) => plantilla.id === value);
  const errorKey = ERROR_KEYS.formularioId;

  if (formularios.length === 0 && !value) {
    return (
      <div className="rounded-grit-md border border-dashed border-grit-glass-border p-4 font-grit-body text-sm text-grit-subtext">
        <p>No tienes formularios activos.</p>
        <GritButton
          variant="ghost"
          size="sm"
          icon="open_in_new"
          href={`/portal/orgs/${tenantId}/gestion-formularios`}
          className="mt-2"
        >
          Crear un formulario
        </GritButton>
      </div>
    );
  }

  return (
    <>
      <Field
        errorKey={errorKey}
        label="Formulario de acceso"
        error={error}
        hint="Se solicitará al adquirir cualquier entrada de este evento."
        hintId="evento-formulario-hint"
      >
        <div className="flex flex-wrap gap-2">
          <div className="min-w-[220px] flex-1">
            <SelectShell>
              <select
                {...fieldA11y(errorKey, error, 'evento-formulario-hint')}
                value={value ?? NONE}
                onChange={(event) => onChange(event.target.value === NONE ? null : event.target.value)}
                disabled={disabled}
                className={selectClass(error)}
              >
                <option value={NONE}>Sin formulario</option>
                {isStale && value && <option value={value}>Formulario inactivo o eliminado</option>}
                {formularios.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre}
                  </option>
                ))}
              </select>
            </SelectShell>
          </div>
          <GritButton
            variant="secondary"
            size="sm"
            icon="visibility"
            onClick={() => value && preview.openPreview(value)}
            disabled={disabled || !value || isStale}
          >
            Vista previa
          </GritButton>
        </div>
      </Field>

      {preview.open && (
        <BodyPortal>
          <FormularioPreviewModal
            open={preview.open}
            tenantId={tenantId}
            plantillaNombre={preview.plantillaNombre}
            secciones={preview.secciones}
            perfilCamposRequeridos={preview.perfilCamposRequeridos}
            loading={preview.loading}
            error={preview.error}
            onClose={preview.closePreview}
          />
        </BodyPortal>
      )}
    </>
  );
}
