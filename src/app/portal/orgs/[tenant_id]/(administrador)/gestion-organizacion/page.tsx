import { TenantInfoCards } from '@/components/portal/tenant/TenantInfoCards';

type GestionOrganizacionTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionOrganizacionTenantPage({
  params,
}: GestionOrganizacionTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Organization Management</h1>
        <p className="mt-2 text-sm text-slate-400">
          Review and update your organization identity, contact channels, and context information.
        </p>
      </header>

      <TenantInfoCards tenantId={tenantId} />
    </section>
  );
}
