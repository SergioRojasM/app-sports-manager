'use client';

import { GritBadge, GritSectionHeading } from '@/components/ui';
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

/** Schedule timeline, matching design node `x03t4` (US-0109, restyled in US-0116). */
export function PublicTrainingDetalleCronograma({
  cronograma,
  duracionMinutos,
}: PublicTrainingDetalleCronogramaProps) {
  if (cronograma.length === 0) return null;

  const duracionTotal = formatDuracionTotal(duracionMinutos);

  return (
    <section className="flex flex-col gap-5">
      <GritSectionHeading
        size="md"
        title="¿Cómo será la sesión?"
        subtitle="Cronograma minuto a minuto del entrenamiento."
        action={duracionTotal ? <GritBadge icon="schedule">{duracionTotal}</GritBadge> : null}
      />

      <ol className="flex flex-col">
        {cronograma.map((entry, index) => {
          const isLast = index === cronograma.length - 1;
          return (
            <li key={index} className="flex gap-4">
              <span className="min-w-[72px] shrink-0 font-grit-body text-[13px] font-bold leading-5 text-grit-cyan">
                {entry.hora}
              </span>
              {/* Rail: cyan dot on the first step, glass-border dots after it;
                  connector omitted on the last step (design `x03t4`) */}
              <span className="flex w-4 shrink-0 flex-col items-center" aria-hidden="true">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${index === 0 ? 'bg-grit-cyan' : 'bg-grit-glass-border'}`}
                />
                {!isLast && <span className="w-[1.5px] flex-1 bg-grit-glass-border" />}
              </span>
              <span
                className={`font-grit-body text-[13px] font-medium leading-5 text-grit-subtext ${isLast ? '' : 'pb-5'}`}
              >
                {entry.descripcion}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
