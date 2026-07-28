/**
 * Portal-level athlete area (US-0093).
 *
 * No role gate on purpose: roles live per tenant (`miembros_tenant.rol_id`) and
 * the users this area exists for — buyers of public plans — hold no membership
 * at all, so a membership check would lock them out. Pages below are self-scoped
 * by `atleta_id = auth.uid()` through RLS, and authentication is already enforced
 * by the parent portal shell (`src/app/portal/layout.tsx`).
 */
export default function PortalAtletaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
