import { OrganizationInfoCards } from '@/components/portal/organization-view/OrganizationInfoCards';

export default function GestionOrganizacionPage() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-100">Organization Management</h1>
        <p className="mt-2 text-sm text-slate-400">
          Review your organization identity, contact channels, and context information.
        </p>
      </header>

      <OrganizationInfoCards />
    </section>
  );
}
