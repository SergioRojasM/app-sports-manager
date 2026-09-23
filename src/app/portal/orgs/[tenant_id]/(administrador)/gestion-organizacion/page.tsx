import { TenantInfoCards } from '@/components/portal/tenant/TenantInfoCards';
import { TenantPaymentMethodsCard } from '@/components/portal/tenant/TenantPaymentMethodsCard';
import { TenantReglasSuspensionCard } from '@/components/portal/tenant/TenantReglasSuspensionCard';
import { GritPageHeader } from '@/components/ui';

type GestionOrganizacionTenantPageProps = {
  params: Promise<{ tenant_id: string }>;
};

export default async function GestionOrganizacionTenantPage({
  params,
}: GestionOrganizacionTenantPageProps) {
  const { tenant_id: tenantId } = await params;

  return (
    <section className="space-y-6">
      <GritPageHeader title="Organization Management" subtitle="Review and update your organization identity, contact channels, and context information." />

      <TenantInfoCards tenantId={tenantId} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TenantPaymentMethodsCard tenantId={tenantId} />
        <TenantReglasSuspensionCard tenantId={tenantId} />
      </div>
    </section>
  );
}
