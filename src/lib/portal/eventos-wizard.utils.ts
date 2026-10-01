import { fromDateTimeLocalInBogota, toDateKeyInBogota, toDateTimeLocalInBogota } from '@/lib/portal/eventos.utils';
import type { PrecioItem } from '@/types/portal/eventos.types';
import type {
  EventoCompleto,
  EventoCuponDraft,
  EventoDraft,
  EventoDuplicadoAjustes,
  EventoEntradaDraft,
  EventoListItem,
  EventoPublicoDetalle,
  EventoWizardErrors,
  EventoWizardStep,
  GuardarEventoPayload,
} from '@/types/portal/eventos.types';

// ─── Limits shared by the form and the validation ───

export const EVENTO_NOMBRE_MAX = 150;
export const EVENTO_DESCRIPCION_MAX = 300;
export const ENTRENADOR_EXPERIENCIA_MAX = 500;
export const ENTRADA_NOMBRE_MAX = 100;
export const CUPON_NOMBRE_MAX = 100;
export const CUPON_CODIGO_PATTERN = /^[A-Z0-9_-]{3,30}$/;
export const EVENTO_BANNER_MAX_BYTES = 5 * 1024 * 1024;
export const EVENTO_BANNER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const EVENTO_DUPLICADO_PREFIJO = 'Copia de ';

export function newClientKey(): string {
  return crypto.randomUUID();
}

// ─── Factories ───

export function emptyEventoDraft(): EventoDraft {
  return {
    nombre: '',
    descripcion: '',
    descripcionLarga: '',
    paginaEventoUrl: '',
    bannerUrl: null,
    disciplina: '',
    fechaHora: '',
    duracionMinutos: '',
    escenario: null,
    puntoEncuentro: '',
    entrenadores: [],
    cupoMaximo: '',
    reservaAntelacionHoras: '',
    cancelacionAntelacionHoras: '',
    omitirConfirmacionCompra: false,
    cronograma: [],
    incluye: [],
    publico: true,
    activo: true,
    entradas: [],
    formularioId: null,
    metodosPago: [],
  };
}

/**
 * New ticket row. The sale window defaults to "from today 00:00 (Bogotá) until the event starts";
 * `fechaHoraEvento` is the draft's `datetime-local` value ('' when the event has no date yet).
 */
export function emptyEntradaDraft(fechaHoraEvento = ''): EventoEntradaDraft {
  return {
    clientKey: newClientKey(),
    id: null,
    tipoEntrada: 'sencilla',
    nombre: '',
    eventosIdBundle: [],
    valor: '',
    validaDesde: `${toDateKeyInBogota(new Date())}T00:00`,
    validaHasta: fechaHoraEvento,
    cupones: [],
  };
}

export function emptyCuponDraft(): EventoCuponDraft {
  return {
    clientKey: newClientKey(),
    id: null,
    nombre: '',
    cupon: '',
    descuento: '',
    validoDesde: '',
    validoHasta: '',
  };
}

function numberToInput(value: number | null): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Stored event → editable draft. Persisted ids become both `id` and `clientKey`. */
export function draftFromEventoCompleto(evento: EventoCompleto): EventoDraft {
  return {
    nombre: evento.nombre ?? '',
    descripcion: evento.descripcion ?? '',
    descripcionLarga: evento.descripcion_larga ?? '',
    paginaEventoUrl: evento.pagina_evento_url ?? '',
    bannerUrl: evento.banner_url,
    disciplina: evento.disciplina_id ?? '',
    fechaHora: toDateTimeLocalInBogota(evento.fecha_hora),
    duracionMinutos: numberToInput(evento.duracion_minutos),
    escenario: evento.escenario_id,
    puntoEncuentro: evento.punto_encuentro ?? '',
    entrenadores: (evento.entrenador_id ?? []).map((entrenador) => ({
      id: entrenador.id,
      nombre: entrenador.nombre,
      experiencia: entrenador.experiencia ?? '',
    })),
    cupoMaximo: numberToInput(evento.cupo_maximo),
    reservaAntelacionHoras: numberToInput(evento.reserva_antelacion_horas),
    cancelacionAntelacionHoras: numberToInput(evento.cancelacion_antelacion_horas),
    omitirConfirmacionCompra: evento.omitir_confirmacion_compra,
    cronograma: evento.cronograma ?? [],
    incluye: evento.incluye ?? [],
    publico: evento.publico,
    activo: evento.activo,
    entradas: evento.entradas.map((entrada) => ({
      clientKey: entrada.id,
      id: entrada.id,
      tipoEntrada: entrada.tipo_entrada,
      nombre: entrada.nombre ?? '',
      eventosIdBundle: entrada.eventos_id_bundle,
      valor: numberToInput(entrada.valor),
      validaDesde: toDateTimeLocalInBogota(entrada.valida_desde),
      validaHasta: toDateTimeLocalInBogota(entrada.valida_hasta),
      cupones: entrada.cupones.map((cupon) => ({
        clientKey: cupon.id,
        id: cupon.id,
        nombre: cupon.nombre ?? '',
        cupon: cupon.cupon ?? '',
        descuento: numberToInput(cupon.descuento),
        validoDesde: toDateTimeLocalInBogota(cupon.valido_desde),
        validoHasta: toDateTimeLocalInBogota(cupon.valido_hasta),
      })),
    })),
    formularioId: evento.formulario_id,
    metodosPago: evento.metodos_pago ?? [],
  };
}

const LOCAL_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Minutes of a `datetime-local` value on a fixed clock (Bogotá has no DST), or null when it is not a full value. */
function localMinutes(value: string): number | null {
  if (!LOCAL_DATETIME_RE.test(value)) return null;
  const time = Date.parse(`${value}:00Z`);
  return Number.isNaN(time) ? null : time / 60_000;
}

/**
 * Moves a window end by the same amount the event date moved, so it keeps its distance to the event
 * (a sale that closed when the event started, or a week before, still does). Returns `value`
 * unchanged when any of the three is not a full `datetime-local` value.
 */
export function shiftWithEventoFecha(value: string, fechaAnterior: string, fechaNueva: string): string {
  const current = localMinutes(value);
  const from = localMinutes(fechaAnterior);
  const to = localMinutes(fechaNueva);
  if (current === null || from === null || to === null) return value;
  return new Date((current + to - from) * 60_000).toISOString().slice(0, 16);
}

/**
 * Stored event → unsaved copy for the create wizard (US-0122). Tickets and coupons get new
 * identities. A past event date is cleared (create mode rejects it) and returned as `fechaOriginal`:
 * the wizard shifts the ticket and coupon window ends from it once the new date is set.
 */
export function draftFromEventoDuplicado(
  evento: EventoCompleto,
  now: number,
): { draft: EventoDraft; ajustes: EventoDuplicadoAjustes; fechaOriginal: string } {
  const base = draftFromEventoCompleto(evento);
  const fechaIso = fromDateTimeLocalInBogota(base.fechaHora);
  const fechaLimpiada = fechaIso !== null && new Date(fechaIso).getTime() <= now;

  const draft: EventoDraft = {
    ...base,
    nombre: `${EVENTO_DUPLICADO_PREFIJO}${base.nombre}`.slice(0, EVENTO_NOMBRE_MAX),
    fechaHora: fechaLimpiada ? '' : base.fechaHora,
    entradas: base.entradas.map((entrada) => ({
      ...entrada,
      clientKey: newClientKey(),
      id: null,
      cupones: entrada.cupones.map((cupon) => ({ ...cupon, clientKey: newClientKey(), id: null })),
    })),
  };

  return { draft, ajustes: { fechaLimpiada }, fechaOriginal: base.fechaHora };
}

// ─── Parsing helpers ───

function trimOrNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Empty → null; anything else → number (NaN when not numeric, caught by validation). */
function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  return Number(trimmed);
}

function parseInteger(value: string): number | null {
  const parsed = parseNumber(value);
  return parsed === null || !Number.isInteger(parsed) ? null : parsed;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Only complete rows reach a preview or the list price summary. */
function completeCronograma(draft: EventoDraft) {
  return draft.cronograma
    .map((row) => ({ hora: row.hora.trim(), descripcion: row.descripcion.trim() }))
    .filter((row) => row.hora || row.descripcion);
}

function completeIncluye(draft: EventoDraft) {
  return draft.incluye
    .map((row) => ({ titulo: row.titulo.trim(), descripcion: row.descripcion.trim() }))
    .filter((row) => row.titulo || row.descripcion);
}

/** Draft → RPC payload. Ticket `orden` follows the on-screen order. */
export function draftToPayload(draft: EventoDraft): GuardarEventoPayload {
  return {
    evento: {
      nombre: draft.nombre.trim(),
      descripcion: trimOrNull(draft.descripcion),
      disciplina_id: trimOrNull(draft.disciplina),
      escenario_id: draft.escenario,
      entrenador_id: draft.entrenadores.map((entrenador) => ({
        id: entrenador.id,
        nombre: entrenador.nombre,
        experiencia: entrenador.experiencia.trim(),
      })),
      fecha_hora: fromDateTimeLocalInBogota(draft.fechaHora),
      duracion_minutos: parseInteger(draft.duracionMinutos),
      cupo_maximo: parseInteger(draft.cupoMaximo),
      punto_encuentro: trimOrNull(draft.puntoEncuentro),
      reserva_antelacion_horas: parseInteger(draft.reservaAntelacionHoras),
      cancelacion_antelacion_horas: parseInteger(draft.cancelacionAntelacionHoras),
      banner_url: draft.bannerUrl,
      activo: draft.activo,
      publico: draft.publico,
      omitir_confirmacion_compra: draft.omitirConfirmacionCompra,
      cronograma: completeCronograma(draft),
      incluye: completeIncluye(draft),
      descripcion_larga: trimOrNull(draft.descripcionLarga),
      pagina_evento_url: trimOrNull(draft.paginaEventoUrl),
      formulario_id: draft.formularioId,
      metodos_pago: draft.metodosPago,
    },
    entradas: draft.entradas.map((entrada, index) => ({
      client_key: entrada.clientKey,
      id: entrada.id,
      tipo_entrada: entrada.tipoEntrada,
      nombre: trimOrNull(entrada.nombre),
      eventos_id_bundle: entrada.tipoEntrada === 'multiple' ? entrada.eventosIdBundle : [],
      valida_desde: fromDateTimeLocalInBogota(entrada.validaDesde),
      valida_hasta: fromDateTimeLocalInBogota(entrada.validaHasta),
      valor: parseNumber(entrada.valor),
      orden: index,
      cupones: entrada.cupones.map((cupon) => ({
        client_key: cupon.clientKey,
        id: cupon.id,
        nombre: trimOrNull(cupon.nombre),
        cupon: trimOrNull(cupon.cupon.toUpperCase()),
        descuento: parseNumber(cupon.descuento),
        valido_desde: fromDateTimeLocalInBogota(cupon.validoDesde),
        valido_hasta: fromDateTimeLocalInBogota(cupon.validoHasta),
      })),
    })),
  };
}

// ─── Preview adapters ───

/** Tickets with a name-independent valid amount, as the list's price summary would show them. */
export function previewPrecio(draft: EventoDraft): PrecioItem[] {
  return draft.entradas
    .map((entrada) => ({ entrada, valor: parseNumber(entrada.valor) }))
    .filter(({ valor }) => valor !== null && !Number.isNaN(valor) && valor >= 0)
    .map(({ entrada, valor }) => ({
      nombre: entrada.nombre.trim() || 'Entrada',
      precio: valor as number,
      descripcion: null,
    }));
}

function entrenadoresLabel(draft: EventoDraft): string | null {
  const label = draft.entrenadores.map((entrenador) => entrenador.nombre).join(', ');
  return label || null;
}

/**
 * Draft → the event detail body's model (US-0120). `nombreTenant` is the event's stored
 * snapshot in edit mode, or the tenant's current name before a new event's first save.
 */
export function toDetallePreviewItem(
  draft: EventoDraft,
  eventoId: string,
  tenantId: string,
  nombreTenant: string | null,
): EventoPublicoDetalle {
  return {
    id: eventoId,
    tenantId,
    nombreTenant: nombreTenant ?? '',
    nombre: draft.nombre.trim() || 'Nombre del evento',
    descripcion: trimOrNull(draft.descripcion),
    paginaEventoUrl: trimOrNull(draft.paginaEventoUrl),
    disciplinaNombre: draft.disciplina || 'Disciplina',
    escenario: draft.escenario,
    escenarioNombre: draft.escenario?.nombre ?? null,
    escenarioUbicacion: draft.escenario?.ubicacion ?? draft.escenario?.direccion ?? null,
    puntoEncuentro: trimOrNull(draft.puntoEncuentro),
    entrenadores: draft.entrenadores,
    entrenadorNombre: entrenadoresLabel(draft),
    fechaHora: fromDateTimeLocalInBogota(draft.fechaHora),
    duracionMinutos: parseInteger(draft.duracionMinutos),
    cupoMaximo: parseInteger(draft.cupoMaximo),
    reservaAntelacionHoras: parseInteger(draft.reservaAntelacionHoras),
    cancelacionAntelacionHoras: parseInteger(draft.cancelacionAntelacionHoras),
    precio: previewPrecio(draft),
    metodosPago: draft.metodosPago,
    bannerUrl: draft.bannerUrl,
    publico: draft.publico,
    descripcionLarga: trimOrNull(draft.descripcionLarga),
    cronograma: completeCronograma(draft),
    incluye: completeIncluye(draft),
  };
}

/** Draft → the management card's view model (rendered with `hideActions`). */
export function toCardPreviewItem(
  draft: EventoDraft,
  eventoId: string,
  tenantId: string,
  borrador: boolean,
): EventoListItem {
  return {
    id: eventoId,
    tenantId,
    nombre: draft.nombre.trim() || 'Nombre del evento',
    descripcion: trimOrNull(draft.descripcion),
    disciplinaNombre: trimOrNull(draft.disciplina),
    escenarioNombre: draft.escenario?.nombre ?? null,
    entrenadorNombre: entrenadoresLabel(draft),
    fechaHora: fromDateTimeLocalInBogota(draft.fechaHora),
    duracionMinutos: parseInteger(draft.duracionMinutos),
    cupoMaximo: parseInteger(draft.cupoMaximo),
    puntoEncuentro: trimOrNull(draft.puntoEncuentro),
    estado: 'confirmado',
    precio: previewPrecio(draft),
    bannerUrl: draft.bannerUrl,
    activo: draft.activo,
    publico: draft.publico,
    borrador,
    formularioId: draft.formularioId,
  };
}

// ─── Validation (same rules as guardar_evento_completo) ───

export type EventoValidationMode = 'borrador' | 'final';

export type EventoValidationContext = {
  mode: EventoValidationMode;
  /** Create mode rejects a past `fecha_hora`. */
  esNuevo: boolean;
  /** Ids of the tenant's active form templates, for the final-save "inactive form" check. */
  formulariosActivosIds: ReadonlySet<string>;
  now?: number;
};

export type EventoValidationResult = {
  errors: EventoWizardErrors;
  /** Steps that contain at least one error, ascending. */
  stepsWithErrors: EventoWizardStep[];
  /** Error key of the first invalid field, in on-screen order. */
  firstErrorKey: string | null;
};

export const ERROR_KEYS = {
  nombre: 'nombre',
  descripcion: 'descripcion',
  paginaEventoUrl: 'paginaEventoUrl',
  disciplina: 'disciplina',
  fechaHora: 'fechaHora',
  duracionMinutos: 'duracionMinutos',
  cupoMaximo: 'cupoMaximo',
  reservaAntelacionHoras: 'reservaAntelacionHoras',
  cancelacionAntelacionHoras: 'cancelacionAntelacionHoras',
  entradas: 'entradas',
  formularioId: 'formularioId',
  metodosPago: 'metodosPago',
  entrenador: (id: string) => `entrenador.${id}.experiencia`,
  entrada: (clientKey: string, field: 'nombre' | 'valor' | 'bundle' | 'ventana') => `entrada.${clientKey}.${field}`,
  cupon: (clientKey: string, field: 'nombre' | 'cupon' | 'descuento' | 'ventana') => `cupon.${clientKey}.${field}`,
} as const;

/** Which wizard step renders the field behind an error key. */
export function stepOfErrorKey(key: string): EventoWizardStep {
  if (key === ERROR_KEYS.entradas || key === ERROR_KEYS.formularioId || key.startsWith('entrada.') || key.startsWith('cupon.')) {
    return 2;
  }
  if (key === ERROR_KEYS.metodosPago) return 3;
  return 1;
}

function checkOptionalInteger(
  errors: EventoWizardErrors,
  key: string,
  value: string,
  { min, message }: { min: number; message: string },
) {
  if (value.trim() === '') return;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) errors[key] = message;
}

function checkVentana(errors: EventoWizardErrors, key: string, desde: string, hasta: string) {
  const desdeIso = fromDateTimeLocalInBogota(desde);
  const hastaIso = fromDateTimeLocalInBogota(hasta);
  if (desde.trim() && !desdeIso) {
    errors[key] = 'Fecha de inicio no válida.';
    return;
  }
  if (hasta.trim() && !hastaIso) {
    errors[key] = 'Fecha de fin no válida.';
    return;
  }
  if (desdeIso && hastaIso && new Date(desdeIso).getTime() >= new Date(hastaIso).getTime()) {
    errors[key] = 'La fecha de inicio debe ser anterior a la de fin.';
  }
}

/**
 * Draft validation: name + format errors only (anything that is wrong in every state).
 * Final validation: draft rules + completeness of all three steps.
 */
export function validateEventoDraft(draft: EventoDraft, context: EventoValidationContext): EventoValidationResult {
  const errors: EventoWizardErrors = {};
  const isFinal = context.mode === 'final';
  const now = context.now ?? Date.now();

  // Step 1
  if (!draft.nombre.trim()) errors[ERROR_KEYS.nombre] = 'Escribe el nombre del evento.';
  else if (draft.nombre.trim().length > EVENTO_NOMBRE_MAX) {
    errors[ERROR_KEYS.nombre] = `El nombre admite máximo ${EVENTO_NOMBRE_MAX} caracteres.`;
  }

  if (draft.descripcion.trim().length > EVENTO_DESCRIPCION_MAX) {
    errors[ERROR_KEYS.descripcion] = `La descripción admite máximo ${EVENTO_DESCRIPCION_MAX} caracteres.`;
  }

  if (draft.paginaEventoUrl.trim() && !isValidHttpUrl(draft.paginaEventoUrl.trim())) {
    errors[ERROR_KEYS.paginaEventoUrl] = 'Ingresa una URL válida (http o https).';
  }

  if (isFinal && !draft.disciplina.trim()) errors[ERROR_KEYS.disciplina] = 'Selecciona la disciplina del evento.';

  const fechaIso = fromDateTimeLocalInBogota(draft.fechaHora);
  if (draft.fechaHora.trim() && !fechaIso) {
    errors[ERROR_KEYS.fechaHora] = 'Fecha no válida.';
  } else if (fechaIso && context.esNuevo && new Date(fechaIso).getTime() < now) {
    errors[ERROR_KEYS.fechaHora] = 'La fecha del evento no puede estar en el pasado.';
  }

  checkOptionalInteger(errors, ERROR_KEYS.duracionMinutos, draft.duracionMinutos, {
    min: 1,
    message: 'La duración debe ser un número entero de minutos mayor a 0.',
  });
  checkOptionalInteger(errors, ERROR_KEYS.cupoMaximo, draft.cupoMaximo, {
    min: 1,
    message: 'El cupo debe ser un número entero mayor a 0.',
  });
  checkOptionalInteger(errors, ERROR_KEYS.reservaAntelacionHoras, draft.reservaAntelacionHoras, {
    min: 0,
    message: 'Debe ser un número entero de horas (0 o más).',
  });
  checkOptionalInteger(errors, ERROR_KEYS.cancelacionAntelacionHoras, draft.cancelacionAntelacionHoras, {
    min: 0,
    message: 'Debe ser un número entero de horas (0 o más).',
  });

  for (const entrenador of draft.entrenadores) {
    if (entrenador.experiencia.length > ENTRENADOR_EXPERIENCIA_MAX) {
      errors[ERROR_KEYS.entrenador(entrenador.id)] = `Máximo ${ENTRENADOR_EXPERIENCIA_MAX} caracteres.`;
    }
  }

  // Step 2
  if (isFinal && draft.entradas.length === 0) errors[ERROR_KEYS.entradas] = 'Agrega al menos una entrada.';

  const eventEnd = fechaIso
    ? new Date(fechaIso).getTime() + (parseInteger(draft.duracionMinutos) ?? 0) * 60_000
    : null;

  const entradaNombres = new Map<string, number>();
  for (const entrada of draft.entradas) {
    const key = entrada.nombre.trim().toLowerCase();
    if (key) entradaNombres.set(key, (entradaNombres.get(key) ?? 0) + 1);
  }

  const codigos = new Map<string, number>();
  for (const entrada of draft.entradas) {
    for (const cupon of entrada.cupones) {
      const code = cupon.cupon.trim().toUpperCase();
      if (code) codigos.set(code, (codigos.get(code) ?? 0) + 1);
    }
  }

  let anyPaid = false;

  for (const entrada of draft.entradas) {
    const nombre = entrada.nombre.trim();
    if (!nombre) {
      if (isFinal) errors[ERROR_KEYS.entrada(entrada.clientKey, 'nombre')] = 'Escribe el nombre de la entrada.';
    } else if (nombre.length > ENTRADA_NOMBRE_MAX) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'nombre')] = `Máximo ${ENTRADA_NOMBRE_MAX} caracteres.`;
    } else if ((entradaNombres.get(nombre.toLowerCase()) ?? 0) > 1) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'nombre')] = 'Ya existe una entrada con ese nombre.';
    }

    const valor = parseNumber(entrada.valor);
    if (valor === null) {
      if (isFinal) errors[ERROR_KEYS.entrada(entrada.clientKey, 'valor')] = 'Ingresa el valor (0 para gratis).';
    } else if (Number.isNaN(valor) || valor < 0 || Math.round(valor * 100) !== valor * 100) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'valor')] = 'Ingresa un valor válido (0 o más, máximo 2 decimales).';
    } else if (valor > 0) {
      anyPaid = true;
    }

    if (isFinal && entrada.tipoEntrada === 'multiple' && entrada.eventosIdBundle.length === 0) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'bundle')] = 'Selecciona al menos un evento para el paquete.';
    }

    checkVentana(errors, ERROR_KEYS.entrada(entrada.clientKey, 'ventana'), entrada.validaDesde, entrada.validaHasta);
    const hastaIso = fromDateTimeLocalInBogota(entrada.validaHasta);
    if (
      !errors[ERROR_KEYS.entrada(entrada.clientKey, 'ventana')] &&
      hastaIso &&
      eventEnd !== null &&
      new Date(hastaIso).getTime() > eventEnd
    ) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'ventana')] = 'La venta no puede terminar después del evento.';
    }

    for (const cupon of entrada.cupones) {
      if (!cupon.nombre.trim()) {
        if (isFinal) errors[ERROR_KEYS.cupon(cupon.clientKey, 'nombre')] = 'Escribe el nombre del cupón.';
      } else if (cupon.nombre.trim().length > CUPON_NOMBRE_MAX) {
        errors[ERROR_KEYS.cupon(cupon.clientKey, 'nombre')] = `Máximo ${CUPON_NOMBRE_MAX} caracteres.`;
      }

      const code = cupon.cupon.trim().toUpperCase();
      if (!code) {
        if (isFinal) errors[ERROR_KEYS.cupon(cupon.clientKey, 'cupon')] = 'Escribe el código del cupón.';
      } else if (!CUPON_CODIGO_PATTERN.test(code)) {
        errors[ERROR_KEYS.cupon(cupon.clientKey, 'cupon')] =
          'Usa de 3 a 30 caracteres: letras, números, guion o guion bajo.';
      } else if ((codigos.get(code) ?? 0) > 1) {
        errors[ERROR_KEYS.cupon(cupon.clientKey, 'cupon')] = 'Este código ya se usa en otro cupón del evento.';
      }

      const descuento = parseNumber(cupon.descuento);
      if (descuento === null) {
        if (isFinal) errors[ERROR_KEYS.cupon(cupon.clientKey, 'descuento')] = 'Ingresa el porcentaje de descuento.';
      } else if (Number.isNaN(descuento) || descuento <= 0 || descuento > 100) {
        errors[ERROR_KEYS.cupon(cupon.clientKey, 'descuento')] = 'El descuento debe estar entre 0 y 100 %.';
      }

      checkVentana(errors, ERROR_KEYS.cupon(cupon.clientKey, 'ventana'), cupon.validoDesde, cupon.validoHasta);
    }

    if (isFinal && valor === 0 && entrada.cupones.length > 0) {
      errors[ERROR_KEYS.entrada(entrada.clientKey, 'valor')] = 'Las entradas gratuitas no admiten cupones.';
    }
  }

  if (isFinal && draft.formularioId && !context.formulariosActivosIds.has(draft.formularioId)) {
    errors[ERROR_KEYS.formularioId] = 'El formulario seleccionado está inactivo o ya no existe.';
  }

  // Step 3
  if (isFinal && anyPaid && draft.metodosPago.length === 0) {
    errors[ERROR_KEYS.metodosPago] = 'Selecciona al menos un método de pago para las entradas con costo.';
  }

  const keys = Object.keys(errors);
  const stepsWithErrors = Array.from(new Set(keys.map(stepOfErrorKey))).sort() as EventoWizardStep[];
  const firstStep = stepsWithErrors[0];
  const firstErrorKey = firstStep ? keys.find((key) => stepOfErrorKey(key) === firstStep) ?? null : null;

  return { errors, stepsWithErrors, firstErrorKey };
}

/** Errors of a single step only (for forward navigation). */
export function errorsForStep(result: EventoValidationResult, step: EventoWizardStep): EventoWizardErrors {
  return Object.fromEntries(Object.entries(result.errors).filter(([key]) => stepOfErrorKey(key) === step));
}

/** Stable serialization used for the unsaved-changes baseline. */
export function serializeDraft(draft: EventoDraft): string {
  return JSON.stringify(draft);
}
