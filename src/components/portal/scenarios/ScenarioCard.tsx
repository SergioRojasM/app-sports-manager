import { GritCard, GritIcon, GritIconButton, GritMediaCard, GritOverlayPill } from '@/components/ui';
import { formatHorarios, mapaEscenarioUrl } from '@/lib/portal/admin-catalogo.utils';
import type { ScenarioWithAvailability } from '@/types/portal/scenarios.types';

type ScenarioCardProps = {
  scenario: ScenarioWithAvailability;
  onEdit: (scenario: ScenarioWithAvailability) => void;
  onDelete: (scenario: ScenarioWithAvailability) => void;
};

/**
 * Scenario card (`qG0T5` `mEIoa`): 150px photo with tipo + status pills, name, location,
 * description, then capacity / schedules and the map · edit · delete actions.
 */
export function ScenarioCard({ scenario, onEdit, onDelete }: ScenarioCardProps) {
  const horarios = scenario.schedules.filter((schedule) => schedule.disponible).length;
  const mapUrl = mapaEscenarioUrl(scenario);
  const location = scenario.ubicacion ?? scenario.direccion;

  return (
    <GritCard as="article" variant="card" padding="none" className="flex flex-col overflow-hidden">
      <GritMediaCard
        image={scenario.image_url}
        placeholderIcon="stadium"
        radius="none"
        stroke="none"
        padding={14}
        className="h-[150px] shrink-0"
        top={
          <div className="flex flex-wrap gap-1.5">
            <GritOverlayPill>{scenario.tipo}</GritOverlayPill>
            <GritOverlayPill tone={scenario.activo ? 'brand' : 'glass'} icon={scenario.activo ? undefined : 'visibility_off'}>
              {scenario.activo ? 'Activo' : 'Inactivo'}
            </GritOverlayPill>
          </div>
        }
      />
      <div className="flex flex-1 flex-col gap-2.5 px-[18px] pb-4 pt-3">
        <h2 className="font-grit-title text-[19px] font-medium leading-tight text-grit-text">{scenario.nombre}</h2>
        <p className="flex items-center gap-1.5 font-grit-body text-xs text-grit-subtext">
          <GritIcon name="location_on" size={13} className="text-grit-cyan" />
          <span className="truncate">{location ?? 'Ubicación no definida'}</span>
        </p>
        {scenario.descripcion ? (
          <p className="line-clamp-2 font-grit-body text-xs text-grit-muted">{scenario.descripcion}</p>
        ) : null}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3.5 gap-y-1 font-grit-body text-xs font-semibold text-grit-text">
            <span className="inline-flex items-center gap-1.5">
              <GritIcon name="group" size={13} className="text-grit-cyan" />
              <span className="sr-only">Capacidad:</span>
              {scenario.capacidad ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GritIcon name="alarm" size={13} className="text-grit-cyan" />
              {formatHorarios(horarios)}
            </span>
          </p>
          {mapUrl ? (
            <GritIconButton icon="map" label={`Ver ${scenario.nombre} en mapa`} size="sm" variant="ghost" href={mapUrl} external />
          ) : null}
          <GritIconButton icon="edit" label={`Editar ${scenario.nombre}`} size="sm" variant="ghost" onClick={() => onEdit(scenario)} />
          <GritIconButton
            icon="delete"
            label={`Eliminar escenario ${scenario.nombre}`}
            size="sm"
            variant="ghost"
            onClick={() => onDelete(scenario)}
          />
        </div>
      </div>
    </GritCard>
  );
}
