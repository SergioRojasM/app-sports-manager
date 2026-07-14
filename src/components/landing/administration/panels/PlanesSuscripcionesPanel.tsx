const plans = [
  { name: 'Premium', price: '$180.000', highlighted: true },
  { name: 'Standard', price: '$120.000', highlighted: false },
  { name: 'Básico', price: '$70.000', highlighted: false },
];

const subscriptions = [
  { name: 'Ana García', plan: 'Premium Anual', status: 'Activa', pending: false },
  { name: 'Luis Fernández', plan: 'Standard Mensual', status: 'Activa', pending: false },
  { name: 'María López', plan: 'Básico Mensual', status: 'Pendiente', pending: true },
];

export default function PlanesSuscripcionesPanel() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <p className="font-landing-body text-[9px] font-bold uppercase tracking-wide text-landing-text-muted">
        Planes
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-md p-1.5 ${
              plan.highlighted
                ? 'border border-landing-primary bg-landing-primary/10'
                : 'border border-landing-border bg-landing-surface-card'
            }`}
          >
            <p
              className={`font-landing-body text-[6.5px] font-bold ${
                plan.highlighted ? 'text-landing-primary' : 'text-landing-text-secondary'
              }`}
            >
              {plan.name}
            </p>
            <p className="font-landing-display text-[9px] font-bold text-landing-text">{plan.price}</p>
          </div>
        ))}
      </div>

      <p className="font-landing-body mt-1 text-[9px] font-bold uppercase tracking-wide text-landing-text-muted">
        Suscripciones activas
      </p>

      <div className="flex flex-col gap-1.5">
        {subscriptions.map((sub) => (
          <div key={sub.name} className="flex items-center gap-1.5">
            <div className="size-4 shrink-0 rounded-full bg-landing-secondary" />
            <div className="flex-1">
              <p className="font-landing-body text-[7px] font-semibold text-landing-text">{sub.name}</p>
              <p className="font-landing-body text-[6px] text-landing-text-muted">{sub.plan}</p>
            </div>
            <span
              className={`font-landing-body text-[6px] font-bold ${
                sub.pending ? 'text-[#F5B942]' : 'text-landing-primary'
              }`}
            >
              {sub.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
