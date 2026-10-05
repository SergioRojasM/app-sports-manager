import { GritIcon, cx } from '@/components/ui';

type EventoActivoBadgeProps = {
  activo: boolean;
  /** Opaque background for use over banner images (cards view). */
  overlay?: boolean;
};

/** "Activo" / "Inactivo" pill. Inactive events are hidden from members and visitors. */
export function EventoActivoBadge({ activo, overlay = false }: EventoActivoBadgeProps) {
  return (
    <span
      title={activo ? 'Publicado en el panel de eventos públicos' : 'Solo visible para el administrador'}
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-grit-body text-xs font-semibold',
        activo ? 'border-grit-success/40 text-grit-success' : 'border-amber-400/60 text-amber-300',
        overlay
          ? cx('shadow-sm backdrop-blur-sm', activo ? 'bg-grit-bg/85' : 'bg-grit-bg/90')
          : activo
            ? 'bg-grit-success/10'
            : 'bg-amber-400/10',
      )}
    >
      <GritIcon name={activo ? 'visibility' : 'visibility_off'} size={14} />
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}
