import type {
  CronogramaItem,
  IncluyeItem,
  PrecioItem,
} from '@/types/portal/entrenamientos-publicos.types';

export type EventoEstado = 'confirmado' | 'cancelado';

export const EVENTO_ESTADOS: readonly EventoEstado[] = ['confirmado', 'cancelado'] as const;

export const EVENTO_ESTADO_LABELS: Record<EventoEstado, string> = {
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
};

/** One row of `public.eventos` (US-0118). */
export type Evento = {
  id: string;
  tenant_id: string;
  nombre: string | null;
  descripcion: string | null;
  disciplina_id: string;
  escenario_id: string | null;
  entrenador_id: string | null;
  fecha_hora: string | null;
  duracion_minutos: number | null;
  cupo_maximo: number | null;
  punto_encuentro: string | null;
  estado: EventoEstado;
  reserva_antelacion_horas: number | null;
  cancelacion_antelacion_horas: number | null;
  /** Ticket options. Empty array means the event is free. */
  precio: PrecioItem[];
  banner_url: string | null;
  activo: boolean;
  publico: boolean;
  creado_por: string | null;
  omitir_confirmacion_compra: boolean;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  descripcion_larga: string | null;
  pagina_evento_url: string | null;
  created_at: string;
  updated_at: string;
};

/** Writable fields for create/update. `tenant_id` and `creado_por` are set by the service. */
export type EventoInput = {
  nombre: string | null;
  descripcion: string | null;
  disciplinaId: string;
  escenarioId: string | null;
  entrenadorId: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  puntoEncuentro: string | null;
  estado: EventoEstado;
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  precio: PrecioItem[];
  bannerUrl: string | null;
  activo: boolean;
  publico: boolean;
  omitirConfirmacionCompra: boolean;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  descripcionLarga: string | null;
  paginaEventoUrl: string | null;
};

/** View model used by the management page. */
export type EventoListItem = {
  id: string;
  tenantId: string;
  nombre: string;
  descripcion: string | null;
  disciplinaId: string;
  disciplinaNombre: string;
  escenarioId: string | null;
  escenarioNombre: string | null;
  entrenadorId: string | null;
  entrenadorNombre: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  puntoEncuentro: string | null;
  estado: EventoEstado;
  precio: PrecioItem[];
  bannerUrl: string | null;
  activo: boolean;
  publico: boolean;
};

/** Server-side filters. `desde` inclusive, `hasta` exclusive (ISO timestamps). */
export type EventosListFilters = {
  desde?: string;
  hasta?: string;
};

export type EventosVista = 'tarjetas' | 'lista' | 'calendario';

export const EVENTOS_VISTAS: readonly EventosVista[] = ['tarjetas', 'lista', 'calendario'] as const;

export type EventosPeriodo = 'proximos' | 'pasados' | 'todos';

export type EventosClientFilters = {
  search: string;
  estado: EventoEstado | 'todos';
  periodo: EventosPeriodo;
  disciplinaId: string | 'todas';
};

export const DEFAULT_EVENTOS_FILTERS: EventosClientFilters = {
  search: '',
  estado: 'todos',
  periodo: 'proximos',
  disciplinaId: 'todas',
};

export type EventosStats = {
  total: number;
  proximosConfirmados: number;
  cancelados: number;
};

export type EventoServiceErrorCode = 'forbidden' | 'invalid_reference' | 'invalid_data' | 'unknown';

export class EventoServiceError extends Error {
  code: EventoServiceErrorCode;

  constructor(code: EventoServiceErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'EventoServiceError';
  }
}
