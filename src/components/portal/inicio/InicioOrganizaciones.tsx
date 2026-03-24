import Link from 'next/link';
import type { InicioMembresia } from '@/types/portal/inicio.types';

export function InicioOrganizaciones({
  membresias,
}: {
  membresias: InicioMembresia[];
}) {
  return (
    <div className="glass-card rounded-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold">Mis Organizaciones</h4>
        <Link
          href="/portal/orgs"
          className="text-secondary text-xs font-semibold hover:underline bg-secondary/10 px-3 py-1.5 rounded-md"
        >
          Ver todas
        </Link>
      </div>

      {membresias.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <span className="material-symbols-outlined text-3xl text-slate-600 mb-2">
            corporate_fare
          </span>
          <p className="text-slate-400 text-sm">No perteneces a ninguna organización</p>
        </div>
      ) : (
        <div className="space-y-2">
          {membresias.map((m) => (
            <Link
              key={m.tenant_id}
              href={`/portal/orgs/${m.tenant_id}`}
              className="flex items-center gap-3 p-3 rounded-md bg-slate-700/30 border border-white/5 hover:border-primary/30 transition-all"
              aria-label={`Ver organización ${m.org_nombre}`}
            >
              {/* Org logo */}
              {m.org_logo ? (
                <img
                  src={m.org_logo}
                  alt={m.org_nombre}
                  className="size-10 rounded-md object-cover"
                />
              ) : (
                <div className="size-10 rounded-md bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-lg">corporate_fare</span>
                </div>
              )}

              {/* Name and role */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-secondary truncate">{m.org_nombre}</p>
              </div>
              <span className="bg-slate-700/50 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">
                {m.rol_nombre}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
