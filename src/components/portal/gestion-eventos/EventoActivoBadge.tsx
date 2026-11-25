import { GritTag } from '@/components/ui';

type EventoActivoBadgeProps = {
  activo: boolean;
  /** Opaque background for use over banner images (cards view). */
  overlay?: boolean;
};

/** "Activo" / "Inactivo" tag. Inactive events are hidden from members and visitors. */
export function EventoActivoBadge({ activo, overlay = false }: EventoActivoBadgeProps) {
  const tag = (
    <GritTag tone={activo ? 'accent' : 'warning'} icon={activo ? 'visibility' : 'visibility_off'}>
      {activo ? 'Activo' : 'Inactivo'}
    </GritTag>
  );

  return (
    <span
      title={activo ? 'Publicado en el panel de eventos públicos' : 'Solo visible para el administrador'}
      className={overlay ? 'inline-flex rounded-full bg-grit-bg/85 backdrop-blur-sm' : 'inline-flex'}
    >
      {tag}
    </span>
  );
}
