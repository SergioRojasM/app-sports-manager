import { getDisciplinaVisual, type DisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatEventoHora, formatEventoPrecio } from '@/lib/portal/eventos.utils';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import type { EventoPublicoListItem } from '@/types/portal/eventos.types';

type EventoLugarSource = Pick<EventoPublicoListItem, 'escenarioNombre' | 'escenarioUbicacion' | 'puntoEncuentro'>;

/**
 * Place shown on event cards: venue name (with its location as detail), otherwise the meeting point,
 * otherwise "Lugar por definir". A meeting point that is a maps link reads "Punto de encuentro"; the link
 * itself lives on the detail page (rule shared by the landing card and the portal cards).
 */
export function getEventoLugarLabel(evento: EventoLugarSource): { lugar: string; lugarDetalle: string | null } {
  const puntoEncuentro = toHttpUrl(evento.puntoEncuentro) ? 'Punto de encuentro' : evento.puntoEncuentro;
  const lugar = evento.escenarioNombre ?? puntoEncuentro ?? 'Lugar por definir';
  const lugarDetalle = evento.escenarioNombre && !toHttpUrl(evento.escenarioUbicacion) ? evento.escenarioUbicacion : null;
  return { lugar, lugarDetalle };
}

/** Capacity pill of the portal hero: "100 cupos" / "1 cupo" / "Cupo ilimitado". */
export function getEventoCupoLabel(cupoMaximo: number | null): string {
  if (!cupoMaximo) return 'Cupo ilimitado';
  return cupoMaximo === 1 ? '1 cupo' : `${cupoMaximo} cupos`;
}

/** Bogotá time in the v3 short form: "4:20 pm" (es-CO prints "4:20 p. m."). */
export function formatHoraCorta(fechaHora: string | null): string {
  const hora = formatEventoHora(fechaHora);
  return hora.replace(/\s*([ap])\.\s*m\./i, (_, letter: string) => ` ${letter.toLowerCase()}m`).replace(/ /g, ' ');
}

export type EventoCardModel = {
  id: string;
  title: string;
  image: string | null;
  dateIso: string | null;
  price: string;
  organizer: string;
  discipline: string;
  disciplineVisual: DisciplinaVisual;
  hora: string;
  lugar: string;
  cupo: string;
  soloMiembros: boolean;
};

/** Domain → presentation data for GritEventCard on the portal (US: grit-arena-v3 athlete pages). */
export function toEventoCardModel(evento: EventoPublicoListItem): EventoCardModel {
  return {
    id: evento.id,
    title: evento.nombre,
    image: evento.bannerUrl,
    dateIso: evento.fechaHora,
    price: formatEventoPrecio(evento.precio),
    organizer: evento.nombreTenant || 'Organización',
    discipline: evento.disciplinaNombre,
    disciplineVisual: getDisciplinaVisual(evento.disciplinaNombre),
    hora: formatHoraCorta(evento.fechaHora),
    lugar: getEventoLugarLabel(evento).lugar,
    cupo: getEventoCupoLabel(evento.cupoMaximo),
    soloMiembros: !evento.publico,
  };
}
