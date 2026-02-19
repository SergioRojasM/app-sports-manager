export default function FeaturesSection() {
  const features = [
    {
      icon: 'sports_score',
      title: 'Training Management',
      description: 'Planificación de sesiones y ejercicios tácticos avanzados con visualización 3D.'
    },
    {
      icon: 'chat_bubble',
      title: 'Player Communication',
      description: 'Canales directos encriptados para feedback instantáneo entre staff y jugadores.'
    },
    {
      icon: 'monitoring',
      title: 'Real-time Stats',
      description: 'Captura de datos biométricos y rendimiento técnico durante cada sesión de juego.'
    },
    {
      icon: 'payments',
      title: 'Payment Calendar',
      description: 'Automatización de cuotas, membresías y finanzas del club integradas en la nube.'
    }
  ];

  return (
    <section id="features" className="py-24 max-w-7xl mx-auto px-6">
      <div className="mb-16">
        <h2 className="text-white text-4xl font-black tracking-tight mb-4">
          Gestión de alto rendimiento
        </h2>
        <div className="h-1 w-20 bg-brand-gradient rounded-full"></div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="p-8 rounded-2xl bg-card-dark border border-white/5 hover:border-accent-teal/30 transition-all group"
          >
            <div className="size-12 rounded-xl bg-accent-teal/10 flex items-center justify-center text-accent-teal mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
            </div>
            <h3 className="text-white text-xl font-bold mb-3">{feature.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
