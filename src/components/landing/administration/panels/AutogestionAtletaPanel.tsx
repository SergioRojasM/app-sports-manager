const navItems = [
  { icon: 'home', label: 'Inicio', active: true },
  { icon: 'calendar_month', label: 'Reservas', active: false },
  { icon: 'payments', label: 'Pagos', active: false },
  { icon: 'person', label: 'Perfil', active: false },
];

export default function AutogestionAtletaPanel() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div>
        <p className="font-landing-body text-[9px] font-bold text-landing-text">Hola, Ana 👋</p>
        <p className="font-landing-body text-[6px] text-landing-text-muted">Bienvenida a tu espacio</p>
      </div>

      <div className="rounded-lg border border-landing-border bg-landing-surface-card p-2">
        <p className="font-landing-body text-[6px] font-medium text-landing-text-muted">Mi plan actual</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-landing-body text-[8px] font-bold text-landing-text">Premium Anual</span>
          <span className="rounded bg-landing-primary/10 px-1.5 py-0.5 font-landing-body text-[5.5px] font-bold text-landing-primary">
            Activo
          </span>
        </div>
        <p className="font-landing-body text-[6px] text-landing-text-muted">Vence el 12/06/2025</p>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 rounded-md bg-landing-primary py-1.5 text-center">
          <span className="font-landing-body text-[6.5px] font-bold text-[#07111F]">Reservar</span>
        </div>
        <div className="flex-1 rounded-md border border-landing-border py-1.5 text-center">
          <span className="font-landing-body text-[6.5px] font-semibold text-landing-text-secondary">
            Mis reservas
          </span>
        </div>
      </div>

      <div>
        <p className="font-landing-body text-[6.5px] font-medium text-landing-text-muted">Próximo entrenamiento</p>
        <div className="mt-1 flex items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-landing-primary/10">
            <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-landing-primary">
              fitness_center
            </span>
          </div>
          <div>
            <p className="font-landing-body text-[7px] font-semibold text-landing-text">Fuerza funcional</p>
            <p className="font-landing-body text-[6px] text-landing-text-muted">Mié, 22 de mayo · 08:00 AM</p>
          </div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-landing-border pt-2">
        {navItems.map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <span
              aria-hidden="true"
              className={`material-symbols-outlined text-[14px] ${
                item.active ? 'text-landing-primary' : 'text-landing-text-muted'
              }`}
            >
              {item.icon}
            </span>
            <span
              className={`font-landing-body text-[5.5px] font-medium ${
                item.active ? 'text-landing-primary' : 'text-landing-text-muted'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
