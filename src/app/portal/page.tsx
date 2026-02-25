import Link from 'next/link';

export default function PortalPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-100">Bienvenido al portal</h1>
        <p className="mt-2 text-slate-400">Selecciona una opción del menú lateral.</p>
        <Link
          href="/portal/orgs"
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90"
        >
          Ver organizaciones
        </Link>
      </div>
    </div>
  );
}
