export default function PricingSection() {
  const plans = [
    {
      name: 'Básico',
      description: 'Ideal para equipos locales y startups deportivas.',
      price: '$29',
      period: '/mes',
      features: [
        'Gestión de hasta 20 jugadores',
        'Calendario básico',
        'Chat de equipo'
      ],
      buttonText: 'Seleccionar',
      popular: false
    },
    {
      name: 'Pro',
      description: 'Gestión avanzada para clubes profesionales.',
      price: '$79',
      period: '/mes',
      features: [
        'Jugadores ilimitados',
        'Estadísticas en tiempo real',
        'Módulo de prevención de lesiones',
        'Video análisis integrado'
      ],
      buttonText: 'Seleccionar Pro',
      popular: true
    },
    {
      name: 'Elite',
      description: 'Para federaciones y organizaciones nacionales.',
      price: '$199',
      period: '/mes',
      features: [
        'Todo lo de Pro',
        'Marca blanca (Custom App)',
        'API y Webhooks',
        'Soporte 24/7 dedicado'
      ],
      buttonText: 'Contactar',
      popular: false
    }
  ];

  return (
    <section id="pricing" className="py-32 max-w-7xl mx-auto px-6">
      <div className="text-center mb-20">
        <h2 className="text-white text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase">
          Planes para cada nivel
        </h2>
        <p className="text-slate-400">Escala tus herramientas según el crecimiento de tu club.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`p-10 rounded-3xl flex flex-col h-full ${
              plan.popular
                ? 'bg-navy-medium border-2 border-transparent bg-clip-border relative scale-105 shadow-[0_0_40px_rgba(0,229,196,0.15)]'
                : 'bg-card-dark border border-white/5'
            }`}
            style={
              plan.popular
                ? { borderImage: 'linear-gradient(135deg, #00e5c4 0%, #00b8a9 100%) 1' }
                : undefined
            }
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-brand-gradient text-white text-[10px] font-black uppercase tracking-tighter px-4 py-1 rounded-full">
                Más popular
              </div>
            )}
            
            <h3 className="text-white text-xl font-bold mb-2">{plan.name}</h3>
            <p className="text-slate-500 text-sm mb-8">{plan.description}</p>
            
            <div className="mb-8">
              <span className="text-white text-4xl font-black">{plan.price}</span>
              <span className="text-slate-500">{plan.period}</span>
            </div>
            
            <ul className="flex flex-col gap-4 mb-10 flex-grow">
              {plan.features.map((feature, featureIndex) => (
                <li key={featureIndex} className="flex items-center gap-3 text-slate-300 text-sm">
                  <span className="material-symbols-outlined text-accent-teal text-sm">
                    check_circle
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            
            <button
              className={`w-full py-4 rounded-full font-bold transition-all ${
                plan.popular
                  ? 'bg-brand-gradient text-white hover:scale-[1.02]'
                  : 'border border-white/10 text-white hover:bg-white/5'
              }`}
            >
              {plan.buttonText}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
