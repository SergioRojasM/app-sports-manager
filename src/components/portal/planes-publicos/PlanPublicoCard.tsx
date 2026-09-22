'use client';

import { MultilineText } from '@/components/ui';
import type { PlanPublicoItem, PlanPublicoTipoItem } from '@/types/portal/planes-publicos.types';

type PlanPublicoCardProps = {
  plan: PlanPublicoItem;
  canAcquire: boolean;
  onAcquire: (plan: PlanPublicoItem) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatVigencia(dias: number): string {
  if (dias === 1) return '1 día';
  if (dias === 30) return '1 mes';
  return `${dias} días`;
}

function formatServicio(nombre: string, unidades: number | null): string {
  if (unidades === null) return `${nombre}: ilimitado`;
  return `${nombre} × ${unidades}`;
}

function TipoRow({ tipo }: { tipo: PlanPublicoTipoItem }) {
  return (
    <li className="rounded-grit-md border border-grit-glass-border bg-grit-card p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-grit-text">{tipo.nombre}</p>
        <p className="text-sm font-semibold text-grit-cyan">{formatCurrency(tipo.precio)}</p>
      </div>

      <p className="mt-1 text-xs text-grit-subtext">Vigencia: {formatVigencia(tipo.vigencia_dias)}</p>

      {tipo.descripcion ? (
        <MultilineText className="mt-1 text-xs text-grit-subtext">{tipo.descripcion}</MultilineText>
      ) : null}

      {tipo.servicios.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {tipo.servicios.map((servicio) => (
            <li
              key={servicio.servicioId}
              className="rounded-full border border-grit-glass-border bg-grit-bg px-2 py-0.5 text-[11px] text-grit-subtext"
            >
              {formatServicio(servicio.servicioNombre, servicio.unidades)}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function PlanPublicoCard({ plan, canAcquire, onAcquire }: PlanPublicoCardProps) {
  return (
    <article className="border bg-grit-glass backdrop-blur-md rounded-grit-lg border-grit-glass-border p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-grit-title text-base font-semibold text-grit-text">{plan.nombre}</h3>
          {plan.descripcion ? (
            <MultilineText className="mt-1 text-sm text-grit-subtext">{plan.descripcion}</MultilineText>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* Only reachable when the viewer is a member — the catalog hides non-public
              plans from everyone else — so the badge explains why it is listed. */}
          {plan.esExclusivoMiembro ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-200">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                workspace_premium
              </span>
              Solo miembros
            </span>
          ) : null}

          {plan.tipo ? (
            <span className="rounded-full border border-grit-glass-border bg-grit-bg px-2.5 py-0.5 text-[11px] capitalize text-grit-subtext">
              {plan.tipo}
            </span>
          ) : null}
        </div>
      </header>

      {plan.disciplinaNames.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {plan.disciplinaNames.map((nombre) => (
            <li
              key={nombre}
              className="rounded-full border border-grit-cyan/30 bg-grit-cyan/10 px-2.5 py-0.5 text-[11px] text-grit-cyan"
            >
              {nombre}
            </li>
          ))}
        </ul>
      ) : null}

      {plan.beneficiosList.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {plan.beneficiosList.map((beneficio) => (
            <li key={beneficio} className="flex items-start gap-1.5 text-xs text-grit-subtext">
              <span className="material-symbols-outlined text-sm text-grit-cyan" aria-hidden="true">
                check
              </span>
              {beneficio}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Collapsed by default: the card leads with the plan itself, and the subtype
          list stays one click away for whoever wants the detail. */}
      {plan.tipos.length > 0 ? (
        <details className="group mt-3 rounded-grit-md border border-grit-glass-border bg-grit-bg/40">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-xs text-grit-subtext [&::-webkit-details-marker]:hidden">
            <span className="font-medium">
              {plan.tipos.length === 1 ? '1 opción disponible' : `${plan.tipos.length} opciones disponibles`}
              <span className="ml-2 font-normal text-grit-subtext">
                desde {formatCurrency(Math.min(...plan.tipos.map((tipo) => tipo.precio)))}
              </span>
            </span>
            <span
              className="material-symbols-outlined text-base transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              expand_more
            </span>
          </summary>

          <ul className="space-y-2 px-3 pb-3">
            {plan.tipos.map((tipo) => (
              <TipoRow key={tipo.id} tipo={tipo} />
            ))}
          </ul>
        </details>
      ) : (
        <p className="mt-3 text-xs text-grit-muted">Este plan no tiene opciones disponibles.</p>
      )}

      {canAcquire && plan.tipos.length > 0 ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onAcquire(plan)}
            className="rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg transition hover:bg-grit-cyan/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-grit-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-grit-bg"
          >
            Adquirir
          </button>
        </div>
      ) : null}
    </article>
  );
}
