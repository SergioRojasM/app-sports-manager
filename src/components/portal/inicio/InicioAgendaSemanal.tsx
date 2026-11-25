'use client';

import { GritButton, GritCard, GritIcon, GritIconButton, GritSectionHeading, cx, gritFocusRing } from '@/components/ui';
import { useAgendaSemanal } from '@/hooks/portal/inicio/useAgendaSemanal';
import type { InicioEntrenamiento, InicioVentana } from '@/types/portal/inicio.types';
import { InicioAgendaItem } from './InicioAgendaItem';

/** Decorative hour lines behind the empty state (`g4TUsF`). */
const HORAS_GRID = ['6:00 am', '8:00 am', '10:00 am', '12:00 pm', '5:00 pm', '7:00 pm'];

type InicioAgendaSemanalProps = {
  ventana: InicioVentana;
  entrenamientos: InicioEntrenamiento[];
  /** Where "Reservar sesión" leads: the single org's trainings, or the organizations list. */
  reservarHref: string;
};

function sesionesLabel(n: number): string {
  if (n === 0) return 'sin sesiones';
  return n === 1 ? '1 sesión' : `${n} sesiones`;
}

/** 7-day agenda panel of `/portal/inicio` (frame `lhbhK` › `brsfw`). */
export function InicioAgendaSemanal({ ventana, entrenamientos, reservarHref }: InicioAgendaSemanalProps) {
  const { selectedKey, select, sesionesDelDia, conteoPorDia, ventanaVacia } = useAgendaSemanal(ventana, entrenamientos);

  return (
    <GritCard variant="card" padding="none" className="flex min-w-0 flex-col gap-4 rounded-grit-3xl p-[22px]">
      <GritSectionHeading
        title="Próximos entrenamientos"
        subtitle="Tus sesiones reservadas"
        size="md"
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-[9px] font-grit-body text-xs font-medium text-grit-subtext">
              <GritIcon name="calendar_today" size={14} />
              <span>
                <span className="sr-only">Semana del </span>
                {ventana.rangoLabel}
              </span>
            </span>
            <GritIconButton href="/portal/mis-reservas" label="Ver mis reservas" icon="arrow_outward" />
          </div>
        }
      />

      <div role="group" aria-label="Días de la semana" className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {ventana.dias.map((dia) => {
          const activo = dia.key === selectedKey;
          const conteo = conteoPorDia[dia.key] ?? 0;
          return (
            <button
              key={dia.key}
              type="button"
              aria-pressed={activo}
              aria-label={`${dia.nombreLargo}, ${sesionesLabel(conteo)}`}
              onClick={() => select(dia.key)}
              className={cx(
                'relative flex min-w-0 flex-col items-center gap-1 rounded-[18px] border py-3 transition-colors',
                gritFocusRing,
                activo
                  ? 'border-transparent bg-grit-cyan text-grit-on-brand'
                  : 'border-white/[0.07] bg-white/[0.03] text-grit-text hover:bg-white/[0.06]',
              )}
            >
              <span
                className={cx(
                  'font-grit-body text-[10px] font-semibold',
                  activo ? 'text-grit-on-brand' : 'text-grit-muted',
                )}
              >
                {dia.dow}
              </span>
              <span className="font-grit-title text-xl font-light leading-none sm:text-2xl">{dia.dia}</span>
              {conteo > 0 && (
                <span
                  aria-hidden
                  className={cx(
                    'absolute bottom-1.5 h-1 w-1 rounded-full',
                    activo ? 'bg-grit-on-brand' : 'bg-grit-cyan',
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {sesionesDelDia.length > 0 ? (
        <ul
          aria-label="Sesiones del día seleccionado"
          className="grit-scrollbar flex flex-col gap-3 xl:max-h-[365px] xl:overflow-y-auto xl:pr-1"
        >
          {sesionesDelDia.map((e) => (
            <InicioAgendaItem key={e.reserva_id} entrenamiento={e} />
          ))}
        </ul>
      ) : (
        <div className="relative min-h-[365px]">
          <div aria-hidden className="absolute inset-0 flex flex-col justify-between py-2">
            {HORAS_GRID.map((hora) => (
              <div key={hora} className="flex items-center gap-3">
                <span className="w-12 shrink-0 font-grit-body text-[10px] text-grit-muted">{hora}</span>
                <span className="h-px flex-1 bg-white/[0.06]" />
              </div>
            ))}
          </div>
          <div className="relative flex min-h-[365px] items-center justify-center px-2">
            <div className="flex w-full max-w-[348px] flex-col items-center gap-2.5 rounded-[24px] border border-white/[0.08] bg-grit-surface-deep/85 px-5 py-6 text-center backdrop-blur-sm sm:px-6">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-grit-cyan/35 bg-grit-cyan/[0.12] text-grit-cyan">
                <GritIcon name="fitness_center" size={22} />
              </span>
              <h3 className="mt-0.5 font-grit-body text-[15px] font-medium text-grit-text">
                {ventanaVacia ? 'No tienes entrenamientos próximos' : 'Sin entrenamientos este día'}
              </h3>
              <p className="font-grit-body text-xs text-grit-muted">
                {ventanaVacia
                  ? '¡Reserva tu próxima sesión de entrenamiento!'
                  : 'Elige otro día de la semana para ver tus sesiones.'}
              </p>
              <GritButton href={reservarHref} icon="add" className="mt-1.5">
                Reservar sesión
              </GritButton>
            </div>
          </div>
        </div>
      )}
    </GritCard>
  );
}
