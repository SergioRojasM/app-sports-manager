import { toDateTimeLocalInBogota } from '@/lib/portal/eventos.utils';
import {
  EVENTO_DESCRIPCION_MAX,
  EVENTO_NOMBRE_MAX,
  emptyEventoDraft,
  numberToInput,
  toEscenarioSnapshot,
} from '@/lib/portal/eventos-wizard.utils';
import type { EntrenamientoParaEvento } from '@/types/portal/entrenamientos.types';
import type { EventoDesdeEntrenamientoAjustes, EventoDraft } from '@/types/portal/eventos.types';

/** Only trainings that have not started yet can be published as an event (US-0132). */
export function esEntrenamientoFuturo(fechaHora: string | null, now: number): boolean {
  if (!fechaHora) return false;
  const time = new Date(fechaHora).getTime();
  return !Number.isNaN(time) && time > now;
}

function nombreEntrenador(entrenador: NonNullable<EntrenamientoParaEvento['entrenador']>): string {
  const fullName = `${entrenador.nombre ?? ''} ${entrenador.apellido ?? ''}`.trim();
  return fullName || entrenador.email || 'Entrenador';
}

/**
 * Future training → new, unsaved event draft (US-0132). Tickets, payment methods and banner stay empty:
 * a training has no prices. The capacity is copied but belongs to the event alone (not shared).
 * The caller checks `esEntrenamientoFuturo` first, so the date is always carried over.
 */
export function draftFromEntrenamiento(entrenamiento: EntrenamientoParaEvento): {
  draft: EventoDraft;
  ajustes: EventoDesdeEntrenamientoAjustes;
  fechaOriginal: string;
} {
  const descripcion = (entrenamiento.descripcion ?? '').trim();
  // A long description goes whole to "Descripción larga" instead of being cut mid-word
  const descripcionMovida = descripcion.length > EVENTO_DESCRIPCION_MAX;
  const formularioExterno = (entrenamiento.formulario_externo ?? '').trim();
  const fechaHora = toDateTimeLocalInBogota(entrenamiento.fecha_hora);

  const draft: EventoDraft = {
    ...emptyEventoDraft(),
    nombre: (entrenamiento.nombre ?? '').trim().slice(0, EVENTO_NOMBRE_MAX),
    descripcion: descripcionMovida ? '' : descripcion,
    descripcionLarga: descripcionMovida ? descripcion : '',
    disciplina: entrenamiento.disciplina?.nombre ?? '',
    fechaHora,
    duracionMinutos: numberToInput(entrenamiento.duracion_minutos),
    escenario: entrenamiento.escenario ? toEscenarioSnapshot(entrenamiento.escenario) : null,
    puntoEncuentro: entrenamiento.punto_encuentro ?? '',
    entrenadores: entrenamiento.entrenador
      ? [{ id: entrenamiento.entrenador.id, nombre: nombreEntrenador(entrenamiento.entrenador), experiencia: '' }]
      : [],
    cupoMaximo: numberToInput(entrenamiento.cupo_maximo),
    reservaAntelacionHoras: numberToInput(entrenamiento.reserva_antelacion_horas),
    cancelacionAntelacionHoras: numberToInput(entrenamiento.cancelacion_antelacion_horas),
    formularioId: entrenamiento.formulario_id,
  };

  return {
    draft,
    ajustes: { descripcionMovida, formularioExternoOmitido: formularioExterno.length > 0 },
    fechaOriginal: fechaHora,
  };
}
