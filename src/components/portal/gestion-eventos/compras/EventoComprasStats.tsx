import { GritIcon } from '@/components/ui';
import { formatCop } from '@/lib/portal/eventos.utils';
import type { EventoComprasStats as Stats, ResumenIngresos } from '@/types/portal/eventos-compras.types';

const CARDS: Array<{ label: string; icon: string; color: string; value: (stats: Stats) => string }> = [
  { label: 'En validación', icon: 'hourglass_top', color: 'text-amber-300', value: (stats) => String(stats.enValidacion) },
  { label: 'Confirmadas', icon: 'task_alt', color: 'text-grit-success', value: (stats) => String(stats.confirmadas) },
  {
    label: 'Ingresos confirmados',
    icon: 'payments',
    color: 'text-grit-cyan',
    value: (stats) => formatCop(stats.ingresosConfirmados),
  },
];

/** Stats row of the admin "Compras" page (US-0121), plus "Ingresaron" when the counters loaded (US-0131). */
export function EventoComprasStats({ stats, ingresos }: { stats: Stats; ingresos?: ResumenIngresos | null }) {
  const cards = ingresos
    ? [
        ...CARDS,
        {
          label: 'Ingresaron',
          icon: 'qr_code_scanner',
          color: 'text-emerald-300',
          value: () => `${ingresos.ingresaron} / ${ingresos.activas}`,
        },
      ]
    : CARDS;

  return (
    <div className={ingresos ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4' : 'grid grid-cols-1 gap-4 sm:grid-cols-3'}>
      {cards.map((card) => (
        <div key={card.label} className="rounded-grit-2xl border border-grit-glass-border bg-grit-glass p-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <GritIcon name={card.icon} size={24} className={card.color} />
            <div>
              <p className="font-grit-body text-sm text-grit-subtext">{card.label}</p>
              <p className="font-grit-title text-2xl font-bold text-grit-text">{card.value(stats)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
