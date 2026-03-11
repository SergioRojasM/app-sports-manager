import type { InicioPagoPendiente } from '@/types/portal/inicio.types';

export function InicioPagosPendientesAlert({
  pagos,
}: {
  pagos: InicioPagoPendiente[];
}) {
  if (pagos.length === 0) return null;

  const total = pagos.reduce((sum, p) => sum + p.monto, 0);
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(total);

  return (
    <div className="glass-card rounded-md p-6 bg-yellow-500/20 border-yellow-500/30">
      <div className="flex items-start gap-4">
        <div className="size-11 rounded-md bg-yellow-500/20 flex items-center justify-center text-yellow-400 flex-shrink-0">
          <span className="material-symbols-outlined text-2xl">payments</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-yellow-300 mb-1">Pagos Pendientes</h4>
          <p className="text-xs text-yellow-200/70">
            Tienes {pagos.length} pago{pagos.length > 1 ? 's' : ''} pendiente
            {pagos.length > 1 ? 's' : ''} por un total de{' '}
            <span className="font-bold text-yellow-300">{formatted}</span>
          </p>
        </div>
      </div>
      <button
        className="mt-4 w-full px-4 py-2 rounded-md bg-yellow-500/30 hover:bg-yellow-500/40 text-yellow-300 font-bold text-xs transition-all border border-yellow-500/30"
        aria-label="Revisar pagos pendientes"
      >
        Revisar Pagos
      </button>
    </div>
  );
}
