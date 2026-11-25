import { GritButton, GritEmptyState, GritNextEventPanel, GritTag } from '@/components/ui';
import { getDisciplinaVisual } from '@/lib/portal/disciplina-visual';
import { formatEventoFecha } from '@/lib/portal/eventos.utils';
import { formatHoraCorta, getEventoLugarLabel } from '@/lib/portal/eventos-card-model';
import { EventoActivoBadge } from './EventoActivoBadge';
import { EventoEstadoBadge } from './EventoEstadoBadge';
import type { ResumenIngresos } from '@/types/portal/eventos-compras.types';
import type { EventoListItem } from '@/types/portal/eventos.types';

type ProximoEventoPanelProps = {
  tenantId: string;
  evento: EventoListItem | null;
  /** null while loading or when the counters failed → meters show "—". */
  resumen: ResumenIngresos | null;
};

/** "Sáb 21 nov · 4:20 pm" */
function fechaCorta(fechaHora: string | null): string {
  const fecha = formatEventoFecha(fechaHora).replace(/\.?,? \d{4}$/, '').replace(/\./g, '').replace(',', '');
  const capitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
  return fechaHora ? `${capitalizada} · ${formatHoraCorta(fechaHora)}` : capitalizada;
}

/** Maps the next event + its counters onto the kit's Next Event Panel (grit-arena-v3 `s2Gt8L`). */
export function ProximoEventoPanel({ tenantId, evento, resumen }: ProximoEventoPanelProps) {
  if (!evento) {
    return (
      <GritEmptyState
        icon="event_upcoming"
        title="Sin eventos próximos"
        description="Cuando confirmes un evento con fecha, lo verás aquí."
        className="min-h-[320px] justify-center"
      />
    );
  }

  const visual = getDisciplinaVisual(evento.disciplinaNombre);
  const { lugar } = getEventoLugarLabel({
    escenarioNombre: evento.escenarioNombre,
    escenarioUbicacion: null,
    puntoEncuentro: evento.puntoEncuentro,
  });
  const base = `/portal/orgs/${tenantId}`;

  return (
    <GritNextEventPanel
      label="Próximo evento"
      image={evento.bannerUrl}
      coverAction={{ icon: 'edit', label: `Editar ${evento.nombre}`, href: `${base}/gestion-eventos/${evento.id}/editar` }}
      title={evento.nombre}
      subtitle={fechaCorta(evento.fechaHora)}
      tags={
        <>
          <GritTag tone="neutral" icon={visual.icon}>
            {evento.disciplinaNombre ?? 'Sin disciplina'}
          </GritTag>
          <GritTag tone="neutral" icon="location_on">
            {lugar === 'Lugar por definir' ? 'Por definir' : lugar}
          </GritTag>
          <EventoEstadoBadge estado={evento.estado} />
          {!evento.activo && <EventoActivoBadge activo={false} />}
        </>
      }
      meters={[
        {
          icon: 'confirmation_number',
          label: 'Entradas emitidas',
          value: resumen?.activas ?? null,
          total: evento.cupoMaximo,
          caption: 'Sin límite',
        },
        {
          icon: 'qr_code_scanner',
          label: 'Check-in',
          value: resumen?.ingresaron ?? null,
          total: resumen ? resumen.activas : null,
          caption: '—',
        },
      ]}
      actions={
        <>
          <GritButton icon="qr_code_scanner" fullWidth href={`${base}/control-ingreso/${evento.id}`}>
            Abrir check-in
          </GritButton>
          <GritButton variant="secondary" icon="group" fullWidth href={`${base}/gestion-eventos/${evento.id}/compras`}>
            Ver asistentes
          </GritButton>
        </>
      }
    />
  );
}
