type SuscripcionTipoBadgeProps = {
  esMiembro: boolean;
};

export function SuscripcionTipoBadge({ esMiembro }: SuscripcionTipoBadgeProps) {
  const classes = esMiembro
    ? 'bg-turquoise/10 text-turquoise border border-turquoise/30'
    : 'bg-slate-800/50 text-slate-400 border border-slate-600/30';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${classes}`}
      aria-label={esMiembro ? 'Miembro' : 'No miembro'}
    >
      {esMiembro ? 'Miembro' : 'No miembro'}
    </span>
  );
}
