/**
 * System-level public tenant UUID.
 * Entrenamientos with `visibilidad = 'publico'` use this tenant as their
 * `visible_para` value, enabling cross-tenant RLS SELECT access.
 * This UUID must match the seeded row in `supabase/seed.sql`.
 */
export const PUBLIC_TENANT_ID = '2a089688-3cfc-4216-9372-33f50079fbd1';
