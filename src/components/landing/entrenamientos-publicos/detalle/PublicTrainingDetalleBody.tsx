'use client';

import { GritDivider } from '@/components/ui';
import type { PublicTrainingListItem } from '@/types/portal/entrenamientos-publicos.types';
import { PublicTrainingDetalleHero } from './PublicTrainingDetalleHero';
import { PublicTrainingDetalleDescripcion } from './PublicTrainingDetalleDescripcion';
import { PublicTrainingDetalleIncluye } from './PublicTrainingDetalleIncluye';
import { PublicTrainingDetalleCronograma } from './PublicTrainingDetalleCronograma';
import { PublicTrainingDetalleUbicacion } from './PublicTrainingDetalleUbicacion';
import { PublicTrainingDetalleReserva } from './PublicTrainingDetalleReserva';
import { PublicTrainingDetallePrecios } from './PublicTrainingDetallePrecios';
import { PublicTrainingDetalleCtaBanner } from './PublicTrainingDetalleCtaBanner';

type PublicTrainingDetalleBodyProps = {
  item: PublicTrainingListItem;
  onReservar: () => void;
  /** True while the booking entry point can't be chosen yet (auth initializing). */
  reservarDisabled: boolean;
};

/**
 * Everything from the hero banner to the closing CTA, laid out per design node
 * `yDuIt` (US-0116). Chrome-agnostic: the caller owns header/footer, the
 * breadcrumb and the booking modals.
 */
export function PublicTrainingDetalleBody({ item, onReservar, reservarDisabled }: PublicTrainingDetalleBodyProps) {
  return (
    <div className="flex flex-col gap-8">
      <PublicTrainingDetalleHero item={item}>
        <GritDivider />
        <PublicTrainingDetalleDescripcion descripcionLarga={item.descripcionLarga} />
      </PublicTrainingDetalleHero>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <PublicTrainingDetalleIncluye incluye={item.incluye} />
        <PublicTrainingDetalleCronograma cronograma={item.cronograma} duracionMinutos={item.duracionMinutos} />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <PublicTrainingDetalleUbicacion
          escenarioNombre={item.escenarioNombre}
          escenarioUbicacion={item.escenarioUbicacion}
          puntoEncuentro={item.puntoEncuentro}
        />
        <PublicTrainingDetalleReserva
          reservasActivas={item.reservasActivas}
          cupoMaximo={item.cupoMaximo}
          duracionMinutos={item.duracionMinutos}
          entrenadorNombre={item.entrenadorNombre}
          paginaEventoUrl={item.paginaEventoUrl}
          reservarDisabled={reservarDisabled}
          onReservar={onReservar}
        />
      </div>

      <PublicTrainingDetallePrecios precio={item.precio} />

      <PublicTrainingDetalleCtaBanner reservarDisabled={reservarDisabled} onReservar={onReservar} />
    </div>
  );
}
