'use client';

import { GritCard, GritSectionHeading } from '@/components/ui';
import type { PrecioItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetallePreciosProps = {
  precio: PrecioItem[];
};

function formatValor(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pricing grid, matching design node `H16bLE` (US-0109, restyled in US-0116).
 *
 * Every card gets an identical visual treatment regardless of its position in
 * the array: the design's "MÁS POPULAR" featured badge and highlighted third
 * card are deliberately NOT implemented, since nothing in the data marks one
 * option as preferred.
 */
export function PublicTrainingDetallePrecios({ precio }: PublicTrainingDetallePreciosProps) {
  if (precio.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <GritSectionHeading
        title="Precios y opciones"
        subtitle="Elige la tarifa que mejor se ajuste a ti. Podrás confirmarla al reservar."
      />

      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {precio.map((option, index) => (
          <GritCard key={index} as="li" variant="card" padding="md" className="flex flex-col gap-3">
            <span className="font-grit-body text-xs font-bold uppercase tracking-wide text-grit-subtext">
              {option.nombre}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-grit-title text-[28px] font-bold leading-none text-grit-text">
                {formatValor(option.precio)}
              </span>
              <span className="font-grit-body text-[13px] font-semibold text-grit-subtext">COP</span>
            </span>
            {option.descripcion && (
              <span className="font-grit-body text-xs font-medium text-grit-subtext">{option.descripcion}</span>
            )}
          </GritCard>
        ))}
      </ul>
    </section>
  );
}
