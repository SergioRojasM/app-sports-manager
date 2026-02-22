export default function Footer() {
  return (
    <footer className="bg-navy-deep py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        {/* Brand Column */}
        <div className="col-span-1 md:col-span-1 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-brand-gradient flex items-center justify-center rounded-sm">
              <span className="material-symbols-outlined text-white text-xs font-bold">
                exercise
              </span>
            </div>
            <h2 className="text-white text-lg font-black italic">qbop training</h2>
          </div>
          
          <p className="text-slate-500 text-sm leading-relaxed">
            Transformando el ADN de los equipos deportivos a través de datos y tecnología de élite.
          </p>
          
          <div className="flex gap-4">
            <a
              href="#"
              className="size-10 rounded-full glass flex items-center justify-center text-white/60 hover:text-accent-teal transition-colors"
            >
              <span className="material-symbols-outlined">public</span>
            </a>
            <a
              href="#"
              className="size-10 rounded-full glass flex items-center justify-center text-white/60 hover:text-accent-teal transition-colors"
            >
              <span className="material-symbols-outlined">video_library</span>
            </a>
            <a
              href="#"
              className="size-10 rounded-full glass flex items-center justify-center text-white/60 hover:text-accent-teal transition-colors"
            >
              <span className="material-symbols-outlined">alternate_email</span>
            </a>
          </div>
        </div>

        {/* Product Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Producto</h4>
          <ul className="flex flex-col gap-4 text-slate-500 text-sm">
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Funcionalidades
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Casos de éxito
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Precios
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Seguridad
              </a>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Compañía</h4>
          <ul className="flex flex-col gap-4 text-slate-500 text-sm">
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Sobre nosotros
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Carreras
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Prensa
              </a>
            </li>
            <li>
              <a className="hover:text-white transition-colors" href="#">
                Contacto
              </a>
            </li>
          </ul>
        </div>

        {/* Newsletter Column */}
        <div>
          <h4 className="text-white font-bold mb-6">Suscríbete al Newsletter</h4>
          <p className="text-slate-500 text-sm mb-4">
            Recibe consejos tácticos y actualizaciones de producto.
          </p>
          <form className="flex flex-col gap-3">
            <input
              className="bg-white/5 border border-white/10 rounded-full px-4 py-2.5 text-sm text-white focus:border-accent-teal focus:ring-0"
              placeholder="tu@email.com"
              type="email"
            />
            <button className="bg-brand-gradient text-white font-bold py-2.5 rounded-full text-sm brand-glow transition-colors">
              Suscribirse
            </button>
          </form>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-slate-600 text-xs">
          © 2024 qbop training Inc. Todos los derechos reservados.
        </p>
        <div className="flex gap-6 text-slate-600 text-xs">
          <a className="hover:text-white" href="#">
            Privacidad
          </a>
          <a className="hover:text-white" href="#">
            Términos
          </a>
          <a className="hover:text-white" href="#">
            Cookies
          </a>
        </div>
      </div>
    </footer>
  );
}
