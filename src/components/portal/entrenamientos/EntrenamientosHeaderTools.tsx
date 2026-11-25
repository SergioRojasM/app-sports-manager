import { GritButton, GritSegmented, type GritSegmentedOption } from '@/components/ui';
import type { EntrenamientosVista } from '@/types/portal/entrenamientos.types';

type EntrenamientosHeaderToolsProps = {
  vista: EntrenamientosVista;
  onVistaChange: (vista: EntrenamientosVista) => void;
  canManage: boolean;
  onCrear: () => void;
};

const VISTA_OPTIONS: ReadonlyArray<GritSegmentedOption<EntrenamientosVista>> = [
  { value: 'mes', label: 'Mes' },
  { value: 'semana', label: 'Semana' },
  { value: 'lista', label: 'Lista' },
];

/** Header tools of "Gestiona tus entrenamientos." (grit-arena-v3 `p5Ms22` `e4WQ9`): view switch + page CTA. */
export function EntrenamientosHeaderTools({ vista, onVistaChange, canManage, onCrear }: EntrenamientosHeaderToolsProps) {
  return (
    <>
      <GritSegmented options={VISTA_OPTIONS} value={vista} onChange={onVistaChange} ariaLabel="Vista del calendario" />
      {canManage && (
        <GritButton size="lg" icon="add" onClick={onCrear}>
          Crear entrenamiento
        </GritButton>
      )}
    </>
  );
}
