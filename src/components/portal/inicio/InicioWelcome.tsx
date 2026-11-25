import { GritPageHeader } from '@/components/ui';

/** Welcome header of `/portal/inicio` (frame `lhbhK` › `Ju5F9`); the page's only h1. */
export function InicioWelcome({ nombre }: { nombre: string }) {
  return (
    <GritPageHeader
      title={nombre ? 'Bienvenido,' : 'Bienvenido'}
      titleAccent={nombre || undefined}
      subtitle="Tus suscripciones, organizaciones y próximos entrenamientos en un solo lugar."
    />
  );
}
