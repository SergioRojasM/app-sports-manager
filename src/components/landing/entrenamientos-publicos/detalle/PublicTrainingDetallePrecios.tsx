'use client';

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
 * Pricing grid, matching design node `H16bLE` (US-0109).
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
      <div className="flex flex-col gap-1">
        <h2 className="font-landing-display text-[22px] font-bold text-landing-text">Precios y opciones</h2>
        <p className="font-landing-body text-[13px] font-medium text-landing-text-secondary">
          Elige la tarifa que mejor se ajuste a ti.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {precio.map((option, index) => (
          <li
            key={index}
            className="flex flex-col gap-2 rounded-xl border border-landing-border bg-landing-surface-card/70 p-4"
          >
            <span className="font-landing-body text-xs font-bold uppercase tracking-wide text-landing-text-secondary">
              {option.nombre}
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-landing-display text-[28px] font-bold text-landing-text">
                {formatValor(option.precio)}
              </span>
              <span className="font-landing-body text-[13px] font-semibold text-landing-text-secondary">COP</span>
            </span>
            {option.descripcion && (
              <span className="font-landing-body text-xs font-medium text-landing-text-secondary">
                {option.descripcion}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
