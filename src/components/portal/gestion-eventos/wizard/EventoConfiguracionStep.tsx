'use client';

import { useCallback, useId } from 'react';
import { GritButton } from '@/components/ui';
import {
  ERROR_KEYS,
  EVENTO_BANNER_MIME_TYPES,
  EVENTO_DESCRIPCION_MAX,
  EVENTO_NOMBRE_MAX,
} from '@/lib/portal/eventos-wizard.utils';
import { EventoEntrenadoresSelector } from './EventoEntrenadoresSelector';
import { EventoEscenarioSelector } from './EventoEscenarioSelector';
import { Field, RowIconButton, SelectShell, WizardSection, fieldA11y, inputClass, selectClass } from './fields';
import type { EventoWizardState } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import type { EventoWizardOptions } from '@/hooks/portal/gestion-eventos/useEventoWizardOptions';

type EventoConfiguracionStepProps = {
  wizard: EventoWizardState;
  options: EventoWizardOptions;
  disabled: boolean;
};

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        aria-describedby={`${id}-desc`}
        className="mt-0.5 h-4 w-4 accent-grit-cyan"
      />
      <span>
        <span className="block font-grit-body text-sm font-semibold text-grit-text">{label}</span>
        <span id={`${id}-desc`} className="block font-grit-body text-xs text-grit-subtext">
          {description}
        </span>
      </span>
    </label>
  );
}

export function EventoConfiguracionStep({ wizard, options, disabled }: EventoConfiguracionStepProps) {
  const { draft, errors, updateField } = wizard;
  const bannerInputId = useId();
  const handleEscenarioChange = useCallback(
    (value: EventoWizardState['draft']['escenario']) => updateField('escenario', value),
    [updateField],
  );
  const disciplinaStale = draft.disciplina !== '' && !options.disciplinas.some((option) => option.label === draft.disciplina);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="space-y-5">
        <WizardSection title="Información básica" icon="info">
          <Field errorKey={ERROR_KEYS.nombre} label="Nombre del evento" required error={errors[ERROR_KEYS.nombre]}>
            <input
              {...fieldA11y(ERROR_KEYS.nombre, errors[ERROR_KEYS.nombre])}
              type="text"
              maxLength={EVENTO_NOMBRE_MAX}
              value={draft.nombre}
              onChange={(event) => updateField('nombre', event.target.value)}
              disabled={disabled}
              placeholder="Copa de verano 2026"
              className={inputClass(errors[ERROR_KEYS.nombre])}
            />
          </Field>

          <Field
            errorKey={ERROR_KEYS.descripcion}
            label="Descripción corta"
            error={errors[ERROR_KEYS.descripcion]}
            hint="Se muestra en la tarjeta del evento."
            hintId="evento-descripcion-hint"
          >
            <textarea
              {...fieldA11y(ERROR_KEYS.descripcion, errors[ERROR_KEYS.descripcion], 'evento-descripcion-hint')}
              rows={2}
              maxLength={EVENTO_DESCRIPCION_MAX}
              value={draft.descripcion}
              onChange={(event) => updateField('descripcion', event.target.value)}
              disabled={disabled}
              className={inputClass(errors[ERROR_KEYS.descripcion])}
            />
          </Field>

          <Field
            errorKey="descripcionLarga"
            label="Descripción larga (Markdown)"
            hint="Se admite Markdown (títulos, negritas, listas) y se muestra en la página del evento."
            hintId="evento-descripcion-larga-hint"
          >
            <textarea
              {...fieldA11y('descripcionLarga', undefined, 'evento-descripcion-larga-hint')}
              rows={5}
              value={draft.descripcionLarga}
              onChange={(event) => updateField('descripcionLarga', event.target.value)}
              disabled={disabled}
              className={inputClass()}
            />
          </Field>

          <Field
            errorKey={ERROR_KEYS.paginaEventoUrl}
            label="Página del evento (URL)"
            error={errors[ERROR_KEYS.paginaEventoUrl]}
            hint='Opcional. Si la defines, se muestra un botón "Ver detalles oficiales".'
            hintId="evento-pagina-hint"
          >
            <input
              {...fieldA11y(ERROR_KEYS.paginaEventoUrl, errors[ERROR_KEYS.paginaEventoUrl], 'evento-pagina-hint')}
              type="url"
              value={draft.paginaEventoUrl}
              onChange={(event) => updateField('paginaEventoUrl', event.target.value)}
              disabled={disabled}
              placeholder="https://tusitio.com/evento"
              className={inputClass(errors[ERROR_KEYS.paginaEventoUrl])}
            />
          </Field>
        </WizardSection>

        <WizardSection title="Imagen del evento" icon="image" description="JPEG, PNG o WebP de máximo 5 MB. Se sube al guardar.">
          {wizard.bannerDisplayUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wizard.bannerDisplayUrl} alt="Imagen actual del evento" className="h-36 w-full rounded-grit-md object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor={bannerInputId} className="sr-only">
              Imagen del evento
            </label>
            <input
              id={bannerInputId}
              type="file"
              accept={EVENTO_BANNER_MIME_TYPES.join(',')}
              onChange={(event) => {
                wizard.selectBannerFile(event.target.files?.[0] ?? null);
                event.target.value = '';
              }}
              disabled={disabled}
              aria-invalid={wizard.bannerError ? true : undefined}
              aria-describedby={wizard.bannerError ? `${bannerInputId}-error` : undefined}
              className="flex-1 font-grit-body text-sm text-grit-subtext file:mr-3 file:rounded-grit-md file:border-0 file:bg-grit-card file:px-3 file:py-2 file:text-sm file:text-grit-text"
            />
            {wizard.bannerDisplayUrl && (
              <GritButton variant="ghost" size="sm" icon="delete" onClick={wizard.removeBanner} disabled={disabled}>
                Quitar imagen
              </GritButton>
            )}
          </div>
          {wizard.bannerError && (
            <p id={`${bannerInputId}-error`} className="font-grit-body text-xs text-grit-danger">
              {wizard.bannerError}
            </p>
          )}
        </WizardSection>

        <WizardSection title="Disciplina" icon="sports">
          <Field
            errorKey={ERROR_KEYS.disciplina}
            label="Disciplina"
            required
            error={errors[ERROR_KEYS.disciplina]}
            hint={wizard.esBorrador ? 'Obligatoria para publicar.' : undefined}
          >
            <SelectShell>
              <select
                {...fieldA11y(ERROR_KEYS.disciplina, errors[ERROR_KEYS.disciplina])}
                value={draft.disciplina}
                onChange={(event) => updateField('disciplina', event.target.value)}
                disabled={disabled}
                className={selectClass(errors[ERROR_KEYS.disciplina])}
              >
                <option value="">Selecciona una disciplina</option>
                {disciplinaStale && <option value={draft.disciplina}>{draft.disciplina} (ya no existe)</option>}
                {options.disciplinas.map((option) => (
                  <option key={option.id} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </SelectShell>
          </Field>
        </WizardSection>

        <WizardSection title="Fecha y lugar" icon="event">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              errorKey={ERROR_KEYS.fechaHora}
              label="Fecha y hora (Bogotá)"
              error={errors[ERROR_KEYS.fechaHora]}
              hint="Déjala vacía si aún no está definida."
              hintId="evento-fecha-hint"
            >
              <input
                {...fieldA11y(ERROR_KEYS.fechaHora, errors[ERROR_KEYS.fechaHora], 'evento-fecha-hint')}
                type="datetime-local"
                value={draft.fechaHora}
                onChange={(event) => updateField('fechaHora', event.target.value)}
                disabled={disabled}
                className={inputClass(errors[ERROR_KEYS.fechaHora])}
              />
            </Field>
            <Field errorKey={ERROR_KEYS.duracionMinutos} label="Duración (minutos)" error={errors[ERROR_KEYS.duracionMinutos]}>
              <input
                {...fieldA11y(ERROR_KEYS.duracionMinutos, errors[ERROR_KEYS.duracionMinutos])}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={draft.duracionMinutos}
                onChange={(event) => updateField('duracionMinutos', event.target.value)}
                disabled={disabled}
                className={inputClass(errors[ERROR_KEYS.duracionMinutos])}
              />
            </Field>
          </div>

          <EventoEscenarioSelector
            tenantId={wizard.tenantId}
            value={draft.escenario}
            onChange={handleEscenarioChange}
            disabled={disabled}
          />

          <Field
            errorKey="puntoEncuentro"
            label="Punto de encuentro"
            hint="Pega el enlace de Google Maps; en la página del evento se muestra como un enlace a la ubicación."
            hintId="evento-punto-encuentro-hint"
          >
            <input
              {...fieldA11y('puntoEncuentro', undefined, 'evento-punto-encuentro-hint')}
              type="text"
              value={draft.puntoEncuentro}
              onChange={(event) => updateField('puntoEncuentro', event.target.value)}
              disabled={disabled}
              placeholder="https://maps.app.goo.gl/KAuYCWHmrx1udyUdA?g_st=ic"
              className={inputClass()}
            />
          </Field>
        </WizardSection>

        <WizardSection title="Entrenadores" icon="sports_handball" description="Puedes seleccionar varios y describir su experiencia.">
          <EventoEntrenadoresSelector
            opciones={options.entrenadores}
            value={draft.entrenadores}
            errors={errors}
            disabled={disabled}
            onToggle={wizard.toggleEntrenador}
            onExperienciaChange={wizard.setEntrenadorExperiencia}
          />
        </WizardSection>

        <WizardSection title="Cupo y reservas" icon="groups">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              errorKey={ERROR_KEYS.cupoMaximo}
              label="Cupo máximo"
              error={errors[ERROR_KEYS.cupoMaximo]}
              hint="Vacío = cupo ilimitado."
              hintId="evento-cupo-hint"
            >
              <input
                {...fieldA11y(ERROR_KEYS.cupoMaximo, errors[ERROR_KEYS.cupoMaximo], 'evento-cupo-hint')}
                type="number"
                min={1}
                step={1}
                inputMode="numeric"
                value={draft.cupoMaximo}
                onChange={(event) => updateField('cupoMaximo', event.target.value)}
                disabled={disabled}
                className={inputClass(errors[ERROR_KEYS.cupoMaximo])}
              />
            </Field>
            <Field
              errorKey={ERROR_KEYS.reservaAntelacionHoras}
              label="Reserva hasta (h antes)"
              error={errors[ERROR_KEYS.reservaAntelacionHoras]}
            >
              <input
                {...fieldA11y(ERROR_KEYS.reservaAntelacionHoras, errors[ERROR_KEYS.reservaAntelacionHoras])}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.reservaAntelacionHoras}
                onChange={(event) => updateField('reservaAntelacionHoras', event.target.value)}
                disabled={disabled}
                className={inputClass(errors[ERROR_KEYS.reservaAntelacionHoras])}
              />
            </Field>
            <Field
              errorKey={ERROR_KEYS.cancelacionAntelacionHoras}
              label="Cancelación hasta (h antes)"
              error={errors[ERROR_KEYS.cancelacionAntelacionHoras]}
            >
              <input
                {...fieldA11y(ERROR_KEYS.cancelacionAntelacionHoras, errors[ERROR_KEYS.cancelacionAntelacionHoras])}
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={draft.cancelacionAntelacionHoras}
                onChange={(event) => updateField('cancelacionAntelacionHoras', event.target.value)}
                disabled={disabled}
                className={inputClass(errors[ERROR_KEYS.cancelacionAntelacionHoras])}
              />
            </Field>
          </div>
          <Toggle
            id="evento-omitir-confirmacion"
            checked={draft.omitirConfirmacionCompra}
            onChange={(value) => updateField('omitirConfirmacionCompra', value)}
            label="Confirmar compras automáticamente"
            description="Las compras de entradas no requerirán aprobación del administrador."
            disabled={disabled}
          />
        </WizardSection>

        <WizardSection
          title="Contenido de la página"
          icon="article"
          description="El orden de las filas es el orden en que se muestran."
        >
          <fieldset className="space-y-2">
            <legend className="mb-1 font-grit-body text-xs font-semibold text-grit-subtext">Cronograma</legend>
            {draft.cronograma.map((row, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                <input
                  type="text"
                  aria-label={`Hora del bloque ${index + 1}`}
                  value={row.hora}
                  onChange={(event) => wizard.updateCronograma(index, 'hora', event.target.value)}
                  disabled={disabled}
                  placeholder="7:00 am"
                  className={inputClass()}
                />
                <input
                  type="text"
                  aria-label={`Descripción del bloque ${index + 1}`}
                  value={row.descripcion}
                  onChange={(event) => wizard.updateCronograma(index, 'descripcion', event.target.value)}
                  disabled={disabled}
                  placeholder="Calentamiento"
                  className={inputClass()}
                />
                <RowIconButton
                  icon="delete"
                  label={`Eliminar bloque ${index + 1}`}
                  onClick={() => wizard.removeCronograma(index)}
                  disabled={disabled}
                  danger
                />
              </div>
            ))}
            <GritButton variant="ghost" size="sm" icon="add" onClick={wizard.addCronograma} disabled={disabled}>
              Añadir bloque
            </GritButton>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-1 font-grit-body text-xs font-semibold text-grit-subtext">¿Qué incluye?</legend>
            {draft.incluye.map((row, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] gap-2">
                <input
                  type="text"
                  aria-label={`Título del ítem ${index + 1}`}
                  value={row.titulo}
                  onChange={(event) => wizard.updateIncluye(index, 'titulo', event.target.value)}
                  disabled={disabled}
                  placeholder="Hidratación"
                  className={inputClass()}
                />
                <input
                  type="text"
                  aria-label={`Descripción del ítem ${index + 1}`}
                  value={row.descripcion}
                  onChange={(event) => wizard.updateIncluye(index, 'descripcion', event.target.value)}
                  disabled={disabled}
                  placeholder="Bebida isotónica al finalizar"
                  className={inputClass()}
                />
                <RowIconButton
                  icon="delete"
                  label={`Eliminar ítem ${index + 1}`}
                  onClick={() => wizard.removeIncluye(index)}
                  disabled={disabled}
                  danger
                />
              </div>
            ))}
            <GritButton variant="ghost" size="sm" icon="add" onClick={wizard.addIncluye} disabled={disabled}>
              Añadir ítem
            </GritButton>
          </fieldset>
        </WizardSection>

        <WizardSection title="Visibilidad" icon="visibility">
          <Toggle
            id="evento-publico"
            checked={draft.publico}
            onChange={(value) => updateField('publico', value)}
            label={draft.publico ? 'Visible para cualquier persona' : 'Solo miembros del equipo'}
            description="Los eventos públicos se muestran también a personas fuera del equipo."
            disabled={disabled}
          />
          <Toggle
            id="evento-activo"
            checked={draft.activo}
            onChange={(value) => updateField('activo', value)}
            label={draft.activo ? 'Activo' : 'Inactivo'}
            description="Si está activo, se publicará en el panel de eventos públicos. Si está inactivo, solo será visible para el administrador."
            disabled={disabled}
          />
        </WizardSection>
      </div>
    </div>
  );
}
