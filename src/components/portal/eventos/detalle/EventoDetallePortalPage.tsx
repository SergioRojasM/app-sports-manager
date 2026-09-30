'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GritIcon } from '@/components/ui';
import { useEventoDetalle } from '@/hooks/portal/eventos/useEventoDetalle';
import { useObtenerEntrada } from '@/hooks/portal/eventos/useObtenerEntrada';
import { resolveEventosOrigin } from '@/lib/portal/eventos-publicos.utils';
import { EventoEntradasModal } from '../EventoEntradasModal';
import { EventoDetalleBody } from './EventoDetalleBody';
import { EventoDetalleStates } from './EventoDetalleStates';

const LISTADO_PATH = '/portal/eventos';

type EventoDetallePortalPageProps = {
  eventoId: string;
};

/** Event detail inside the portal (US-0120): public events plus the private ones of the user's tenants. */
export function EventoDetallePortalPage({ eventoId }: EventoDetallePortalPageProps) {
  const { evento, loading, error, refetch } = useEventoDetalle(eventoId, { soloPublicos: false });
  const obtenerEntrada = useObtenerEntrada({ surface: 'portal', autoOpen: { evento, ready: !loading } });
  const searchParams = useSearchParams();
  const origin = resolveEventosOrigin(searchParams.get('from'), LISTADO_PATH);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={origin}
        className="inline-flex w-fit items-center gap-1 font-grit-body text-[13px] font-semibold text-grit-subtext transition hover:text-grit-cyan"
      >
        <GritIcon name="arrow_back" size={15} />
        Volver a eventos
      </Link>

      {loading ? (
        <EventoDetalleStates state="loading" />
      ) : error ? (
        <EventoDetalleStates state="error" error={error} onRetry={() => void refetch()} />
      ) : !evento ? (
        <EventoDetalleStates state="not-found" listadoHref={LISTADO_PATH} />
      ) : (
        <EventoDetalleBody
          evento={evento}
          onObtenerEntrada={() => obtenerEntrada.obtenerEntrada(evento)}
          obtenerEntradaDisabled={obtenerEntrada.disabled}
        />
      )}

      <EventoEntradasModal
        open={obtenerEntrada.entradasModal.open}
        evento={obtenerEntrada.target}
        modo={obtenerEntrada.entradasModal.modo}
        onClose={obtenerEntrada.entradasModal.close}
      />
    </div>
  );
}
