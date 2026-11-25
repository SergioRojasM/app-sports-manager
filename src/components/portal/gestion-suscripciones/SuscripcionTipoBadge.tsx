type SuscripcionTipoBadgeProps = {
  esMiembro: boolean;
};

export function SuscripcionTipoBadge({ esMiembro }: SuscripcionTipoBadgeProps) {
  const classes = esMiembro
    ? 'bg-grit-cyan/10 text-grit-cyan border border-grit-cyan/30'
    : 'bg-grit-card text-grit-subtext border border-grit-glass-border';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
      aria-label={esMiembro ? 'Miembro' : 'No miembro'}
    >
      {esMiembro ? 'Miembro' : 'No miembro'}
    </span>
  );
}
