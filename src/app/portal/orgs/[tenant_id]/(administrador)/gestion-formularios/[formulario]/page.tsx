import { FormularioEditorPage } from '@/components/portal/formularios';

type GestionFormularioEditorPageProps = {
	params: Promise<{ tenant_id: string; formulario: string }>;
};

export default async function GestionFormularioEditorPage({ params }: GestionFormularioEditorPageProps) {
	const { tenant_id: tenantId, formulario: plantillaId } = await params;

	return <FormularioEditorPage tenantId={tenantId} plantillaId={plantillaId} />;
}
