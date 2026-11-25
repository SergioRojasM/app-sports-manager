import type { ReactNode } from 'react';
import { GritCard, GritIcon, GritIconButton, GritTag, cx } from '@/components/ui';
import { buildPlanCardModel, type PlanVisibilidad } from '@/lib/portal/admin-catalogo.utils';
import type { PlanWithDisciplinas } from '@/types/portal/planes.types';

type PlanCardProps = {
  plan: PlanWithDisciplinas;
  /** Resolved names of the plan's disciplines (rendered as chips, or "Sin disciplinas"). */
  disciplinaNames?: string[];
  /** admin = visibility chip + edit / duplicate / delete · readonly = catalogue for athletes and trainers. */
  mode: 'admin' | 'readonly';
  onEdit?: (plan: PlanWithDisciplinas) => void;
  onDuplicate?: (plan: PlanWithDisciplinas) => void;
  onDelete?: (plan: PlanWithDisciplinas) => void;
  /** Footer action of the read-only card (e.g. "Adquirir"). */
  action?: ReactNode;
};

const VISIBILIDAD: Record<PlanVisibilidad, { icon: string; label: string }> = {
  publico: { icon: 'language', label: 'Público' },
  privado: { icon: 'lock', label: 'Privado' },
  oculto: { icon: 'visibility_off', label: 'Oculto' },
};

/**
 * Membership plan card (`J7Lw7d` `vn0ug`): modality / visibility / status, name, price "desde" the
 * cheapest active subtype, subtype rows, "INCLUYE" (services + benefits) and the card actions.
 * Revenue, sparkline and subscribers are not built (analytics deferred).
 */
export function PlanCard({ plan, disciplinaNames, mode, onEdit, onDuplicate, onDelete, action }: PlanCardProps) {
  const model = buildPlanCardModel(plan);
  const visibilidad = VISIBILIDAD[model.visibilidad];
  const hasIncluye = model.servicios.length > 0 || model.beneficios.length > 0;

  return (
    <GritCard
      as="article"
      variant="card"
      padding="none"
      aria-labelledby={`plan-${plan.id}`}
      className={cx('flex flex-col gap-3.5 p-5', !model.activo && 'opacity-80')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {model.modalidadLabel ? <GritTag tone="neutral">{model.modalidadLabel}</GritTag> : null}
          {mode === 'admin' ? (
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 font-grit-body text-[10px] font-semibold leading-none',
                model.visibilidad === 'oculto'
                  ? 'border-grit-warning/25 bg-grit-warning/[0.08] text-grit-warning'
                  : 'border-white/10 bg-white/[0.03] text-grit-subtext',
              )}
            >
              <GritIcon name={visibilidad.icon} size={11} />
              {visibilidad.label}
            </span>
          ) : null}
        </div>
        <GritTag tone={model.activo ? 'accent' : 'neutral'} dot>
          {model.activo ? 'Activo' : 'Inactivo'}
        </GritTag>
      </div>

      <h2 id={`plan-${plan.id}`} className="font-grit-title text-[22px] font-medium leading-tight text-grit-text">
        {plan.nombre}
      </h2>

      {disciplinaNames ? (
        disciplinaNames.length > 0 ? (
          <ul className="-mt-1.5 flex flex-wrap gap-1.5" aria-label="Disciplinas">
            {disciplinaNames.map((nombre) => (
              <li key={nombre}>
                <GritTag tone="neutral">{nombre}</GritTag>
              </li>
            ))}
          </ul>
        ) : (
          <p className="-mt-1.5 font-grit-body text-[11px] text-grit-muted">Sin disciplinas</p>
        )
      ) : null}

      {model.precio ? (
        <p className="flex items-baseline gap-1.5">
          <span className="font-grit-title text-[34px] font-light leading-none text-grit-text">{model.precio.valor}</span>
          <span className="font-grit-body text-xs text-grit-muted">{model.precio.vigencia}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-grit-title text-2xl font-light text-grit-subtext">Sin precio</p>
          {mode === 'admin' ? (
            <p className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-warning">
              <GritIcon name="rocket_launch" size={12} />
              Agrega un subtipo activo para publicarlo
            </p>
          ) : null}
        </div>
      )}

      {model.subtipos.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-label="Subtipos">
          {model.subtipos.map((subtipo) => (
            <li
              key={subtipo.id}
              className="flex items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.025] px-2.5 py-[7px] font-grit-body text-[11px] font-medium text-grit-text"
            >
              <GritIcon name="autorenew" size={12} className="text-grit-cyan" />
              {subtipo.label}
            </li>
          ))}
        </ul>
      ) : null}

      {hasIncluye ? (
        <>
          <hr className="border-white/[0.06]" />
          <div className="flex flex-col gap-2">
            <p className="font-grit-body text-[9px] font-semibold uppercase tracking-[1.3px] text-grit-muted">Incluye</p>
            <ul className="flex flex-col gap-2">
              {model.servicios.map((servicio) => (
                <li key={`s-${servicio}`} className="flex items-start gap-2 font-grit-body text-xs text-grit-subtext">
                  <GritIcon name="check_circle" size={14} className="mt-px text-grit-cyan" />
                  {servicio}
                </li>
              ))}
              {model.beneficios.map((beneficio) => (
                <li key={`b-${beneficio}`} className="flex items-start gap-2 font-grit-body text-xs text-grit-subtext">
                  <GritIcon name="redeem" size={14} className="mt-px text-grit-violet" />
                  {beneficio}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      <span className="flex-1" />

      {mode === 'admin' ? (
        <div className="flex items-center justify-end gap-1 border-t border-white/[0.06] pt-3">
          <GritIconButton icon="edit" label={`Editar ${plan.nombre}`} size="sm" variant="ghost" onClick={() => onEdit?.(plan)} />
          <GritIconButton icon="content_copy" label={`Duplicar ${plan.nombre}`} size="sm" variant="ghost" onClick={() => onDuplicate?.(plan)} />
          <GritIconButton icon="delete" label={`Eliminar ${plan.nombre}`} size="sm" variant="ghost" onClick={() => onDelete?.(plan)} />
        </div>
      ) : action ? (
        <div className="border-t border-white/[0.06] pt-3">{action}</div>
      ) : null}
    </GritCard>
  );
}
