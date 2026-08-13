const MARKETPLACE_PATH = '/portal/entrenamientos-publicos';

const GUIADO_PARAM = 'guiado';
const ENTRENAMIENTO_PARAM = 'entrenamiento';
const TENANT_PARAM = 'tenant';
const DISCIPLINA_PARAM = 'disciplina';
const NOMBRE_PARAM = 'nombre';

export type GuidedBookingTarget = {
  entrenamientoId: string;
  tenantId: string;
  disciplinaId: string;
  nombre: string;
};

/**
 * Step lists for GuidedBookingStepper, kept as independent, decoupled phases rather than
 * one continuous 1-N sequence across pages: a returning user going through login never
 * needs "Crear cuenta"/"Confirmar tu correo" (those don't apply to them), and by the time
 * either path reaches the booking modal, authentication is already done either way — so
 * the booking phase doesn't need to know or care which auth path was taken.
 */
export const GUIDED_SIGNUP_STEPS = ['Crear cuenta', 'Confirmar tu correo'] as const;
export const GUIDED_LOGIN_STEPS = ['Iniciar sesión'] as const;
export const GUIDED_BOOKING_STEPS = ['Completar tus datos', 'Verificar y reservar', 'Formulario y confirmación'] as const;

export function buildGuidedNextPath(target: GuidedBookingTarget): string {
  const params = new URLSearchParams({
    [GUIADO_PARAM]: '1',
    [ENTRENAMIENTO_PARAM]: target.entrenamientoId,
    [TENANT_PARAM]: target.tenantId,
    [DISCIPLINA_PARAM]: target.disciplinaId,
    [NOMBRE_PARAM]: target.nombre,
  });
  return `${MARKETPLACE_PATH}?${params.toString()}`;
}

/**
 * Accepts either a live `URLSearchParams` (e.g. from `useSearchParams()` on the
 * marketplace page) or a `next` path string (e.g. `nextPath` on the signup/login pages) —
 * both carry the same guided target, just at different points in the redirect chain.
 */
export function parseGuidedParams(input: URLSearchParams | string): GuidedBookingTarget | null {
  const searchParams = typeof input === 'string' ? extractSearchParams(input) : input;

  if (searchParams.get(GUIADO_PARAM) !== '1') return null;

  const entrenamientoId = searchParams.get(ENTRENAMIENTO_PARAM);
  const tenantId = searchParams.get(TENANT_PARAM);
  const disciplinaId = searchParams.get(DISCIPLINA_PARAM);
  const nombre = searchParams.get(NOMBRE_PARAM);

  if (!entrenamientoId || !tenantId || !disciplinaId) return null;

  return { entrenamientoId, tenantId, disciplinaId, nombre: nombre ?? '' };
}

function extractSearchParams(pathOrUrl: string): URLSearchParams {
  const queryIndex = pathOrUrl.indexOf('?');
  if (queryIndex === -1) return new URLSearchParams();
  return new URLSearchParams(pathOrUrl.slice(queryIndex + 1));
}
