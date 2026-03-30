export default function FeaturesSection() {
  const features = [
    {
      icon: 'monitoring',
      title: 'Procesos centralizados de tu equipo',
      description: 'Gestiona y centraliza todos los procesos relacionados a la gestion de tu equipo.'
    },
    {
      icon: 'sports_score',
      title: 'Administración de entrenamientos',
      description: 'Planificación de sesiones de entrenamiento, seguimiento de rendimiento y análisis de datos.'
    },
    {
      icon: 'chat_bubble',
      title: 'Gestión de Atletas',
      description: 'Seguimiento y gestión integral de los atletas, incluyendo estadísticas, rendimiento y comunicación.'
    },
    {
      icon: 'payments',
      title: 'Seguimiento y gestion de pagos',
      description: 'Centralización de pagos, membresías y restricciones.'
    },
    {
      icon: 'sports',
      title: 'Acceso a entrenamientos públicos y privados',
      description: 'Centralización de entrenamientos, control y disponibilidad a entrenamientos públicos y privados.'
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
