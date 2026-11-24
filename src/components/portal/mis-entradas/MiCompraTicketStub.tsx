'use client';

import { GritIcon, GritTag } from '@/components/ui';
import { useTicketQr } from '@/hooks/portal/mis-entradas/useTicketQr';
import type { MiCompra } from '@/types/portal/eventos-compras.types';

/** First ticket valid at the door, or null. */
export function ticketParaIngreso(compra: Pick<MiCompra, 'tickets'>) {
  return compra.tickets.find((ticket) => ticket.estado === 'activa') ?? null;
}

/** Stub of the ticket card (grit-arena-v3 `hndPr`): QR of the first active ticket, generated in the browser. */
export function MiCompraTicketStub({ compra }: { compra: MiCompra }) {
  const ticket = ticketParaIngreso(compra);
  const { src, error } = useTicketQr(ticket?.codigo ?? null);
  const enValidacion = compra.estado === 'pendiente_pago' || compra.estado === 'en_validacion';

  return (
    <div className="flex flex-col items-center justify-center gap-3.5 bg-[radial-gradient(circle_at_50%_30%,rgba(20,219,196,0.10),transparent_70%)] px-6 py-[26px] text-center">
      <p className="font-grit-body text-[9px] font-semibold tracking-[2px] text-grit-muted">PRESENTA EN EL INGRESO</p>

      {ticket ? (
        <>
          <div className="flex h-[148px] w-[148px] items-center justify-center rounded-[18px] bg-grit-text p-3">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={`Código QR de la entrada ${ticket.codigo}`} className="h-full w-full" />
            ) : error ? (
              <GritIcon name="qr_code_2" size={64} className="text-grit-on-brand/40" label="QR no disponible" />
            ) : (
              <span className="h-full w-full animate-pulse rounded-[10px] bg-grit-bg/10 motion-reduce:animate-none" aria-hidden="true" />
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-grit-body text-[10px] text-grit-muted">Código</span>
            <span className="font-grit-mono text-[15px] font-semibold tracking-[1.5px] text-grit-cyan">{ticket.codigo}</span>
            {ticket.ingresoAt ? (
              <GritTag tone="neutral" icon="how_to_reg" className="mt-1">
                Usada
              </GritTag>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex max-w-[200px] flex-col items-center gap-2.5 py-6">
          <GritIcon name={enValidacion ? 'hourglass_top' : 'do_not_disturb_on'} size={32} className={enValidacion ? 'text-grit-warning' : 'text-grit-muted'} />
          <p className="font-grit-body text-xs text-grit-subtext">
            {enValidacion ? 'Disponible cuando se confirme tu pago' : 'Entrada no válida'}
          </p>
        </div>
      )}
    </div>
  );
}
