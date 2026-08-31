'use client';

import type { CronogramaItem } from '@/types/portal/entrenamientos-publicos.types';

type PublicTrainingDetalleCronogramaProps = {
  cronograma: CronogramaItem[];
  duracionMinutos: number | null;
};

/** "1h 30min en total" — derived from the existing duration, no extra field (US-0109). */
function formatDuracionTotal(duracionMinutos: number | null): string | null {
  if (!duracionMinutos || duracionMinutos <= 0) return null;
  const horas = Math.floor(duracionMinutos / 60);
  const minutos = duracionMinutos % 60;
  if (horas === 0) return `${minutos}min en total`;
  if (minutos === 0) return `${horas}h en total`;
  return `${horas}h ${minutos}min en total`;
}

/** Schedule timeline, matching design node `x03t4` (US-0109). */
export function PublicTrainingDetalleCronograma({
  cronograma,
  duracionMinutos,
}: PublicTrainingDetalleCronogramaProps) {
  if (cronograma.length === 0) return null;

  const duracionTotal = formatDuracionTotal(duracionMinutos);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-landing-display text-xl font-bold text-landing-text">¿Cómo será la sesión?</h2>
          <p className="font-landing-body text-xs font-medium text-landing-text-secondary">
            Cronograma minuto a minuto del entrenamiento.
          </p>
        </div>
        {duracionTotal && (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-landing-surface-card/80 px-3 py-1.5 font-landing-body text-xs font-semibold text-landing-text">
            <span className="material-symbols-outlined text-sm text-landing-primary" aria-hidden="true">
              timer
            </span>
            {duracionTotal}
          </span>
        )}
      </div>

      <ol className="flex flex-col">
        {cronograma.map((entry, index) => {
          const isLast = index === cronograma.length - 1;
          return (
            <li key={index} className="flex gap-3">
              <span className="w-20 shrink-0 pt-px text-right font-landing-body text-[13px] font-bold text-landing-primary">
                {entry.hora}
              </span>
              {/* Rail: filled dot on the first step, connector omitted on the
                  last one so the timeline terminates cleanly (design `x03t4`) */}
              <span className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    index === 0 ? 'bg-landing-primary' : 'bg-landing-primary/25'
                  }`}
                />
                {!isLast && <span className="w-px flex-1 bg-landing-primary/25" />}
              </span>
              <span className={`font-landing-body text-[13px] font-medium text-landing-text-secondary ${isLast ? '' : 'pb-4'}`}>
                {entry.descripcion}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
