import { redirect } from 'next/navigation';

/**
 * Legacy tenant-scoped route. "Mis Suscripciones" is now cross-tenant at
 * `/portal/mis-suscripciones` (US-0093); this keeps old links working.
 */
export default function MisSuscripcionesYPagosTenantPage() {
  redirect('/portal/mis-suscripciones');
}
