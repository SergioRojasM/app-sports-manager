import { redirect } from 'next/navigation';

/**
 * Legacy tenant-scoped route. "Mis Reservas" is now cross-tenant at
 * `/portal/mis-reservas` (US-0097); this keeps old links working.
 */
export default function MisReservasTenantPage() {
  redirect('/portal/mis-reservas');
}
