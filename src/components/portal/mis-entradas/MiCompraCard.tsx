'use client';

import { useState } from 'react';
import { GritAvatar, GritButton, GritCard, GritDateTile, GritIcon, GritOverlayPill, GritTag, cx } from '@/components/ui';
import { PoliticaCancelacion } from '@/components/portal/eventos/compra';
import { formatCop } from '@/lib/portal/eventos.utils';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { miCompraToPdf, nombreArchivoPdf, puedeDescargarPdf } from '@/lib/portal/eventos-compra.utils';
import { descargarEntradasPdf } from '@/lib/portal/eventos-ticket-pdf';
import { formatFechaLarga, getCountdown } from '@/lib/portal/mis-entradas-countdown';
import { EVENTO_COMPRA_ESTADO_LABELS, type MiCompra } from '@/types/portal/eventos-compras.types';
import { CancelarCompraModal } from './CancelarCompraModal';
import { MiCompraTicketStub } from './MiCompraTicketStub';
import { ReenviarComprobanteModal } from './ReenviarComprobanteModal';

type MiCompraCardProps = {
  compra: MiCompra;
  puedeCancelar: boolean;
  pendiente: 'cancelar' | 'reenviar' | undefined;
  error: string | undefined;
  onCancelar: () => Promise<boolean>;
  onReenviar: (file: File) => Promise<boolean>;
  onLimpiarError: () => void;
};

function Field({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
      <dt className="flex items-center gap-1.5 font-grit-body text-[11px] text-grit-muted">
        <GritIcon name={icon} size={12} />
        {label}
      </dt>
      <dd className="truncate font-grit-title text-[17px] font-normal leading-tight text-grit-text">{children}</dd>
    </div>
  );
}

/** One purchase in "Mis entradas" as a v3 ticket (grit-arena-v3 `Q4MEM`): event side · details · QR stub. */
export function MiCompraCard({ compra, puedeCancelar, pendiente, error, onCancelar, onReenviar, onLimpiarError }: MiCompraCardProps) {
  const [modal, setModal] = useState<'cancelar' | 'reenviar' | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [descargaError, setDescargaError] = useState<string | null>(null);

  const evento = compra.evento;
  const nombre = evento?.nombre ?? 'Evento no disponible';
  const lugarUrl = toHttpUrl(evento?.lugar);
  const multiple = compra.tickets.length > 1;
  const countdown = compra.estado === 'confirmada' || compra.estado === 'en_validacion' ? getCountdown(evento?.fechaHora ?? null) : null;
  const confirmada = compra.estado === 'confirmada';

  const abrir = (tipo: 'cancelar' | 'reenviar') => {
    onLimpiarError();
    setModal(tipo);
  };

  const descargar = async () => {
    setDescargando(true);
    setDescargaError(null);
    try {
      const principal = compra.tickets[0];
      await descargarEntradasPdf(miCompraToPdf(compra), nombreArchivoPdf(nombre, principal?.codigo ?? compra.id.slice(0, 8)));
    } catch (pdfError) {
      console.error('MiCompraCard: PDF failed', pdfError);
      setDescargaError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <GritCard
      as="article"
      variant={confirmada ? 'highlight' : 'card'}
      padding="none"
      className="grid grid-cols-1 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)_2px_260px]"
    >
      {/* Event side */}
      <div className="relative isolate flex min-h-[220px] flex-col justify-between gap-4 overflow-hidden p-[22px] lg:min-h-[300px]">
        {evento?.bannerUrl && !bannerError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.bannerUrl} alt="" onError={() => setBannerError(true)} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 -z-10 flex items-center justify-center bg-[linear-gradient(160deg,rgba(20,219,196,0.18),rgba(8,12,16,1)_65%)]">
            <GritIcon name="confirmation_number" size={48} className="text-grit-cyan/35" />
          </span>
        )}
        <span aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,12,16,0.55)_0%,rgba(8,12,16,0)_35%,rgba(8,12,16,0.95)_100%)]" />

        <div className="flex items-start justify-between gap-2">
          <GritOverlayPill tone={confirmada ? 'brand' : 'glass'} icon={confirmada ? 'check_circle' : 'info'}>
            {EVENTO_COMPRA_ESTADO_LABELS[compra.estado].toUpperCase()}
          </GritOverlayPill>
          <GritDateTile dateIso={evento?.fechaHora ?? null} size="lg" />
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {evento?.nombreTenant ? (
            <span className="flex min-w-0 items-center gap-2">
              <GritAvatar name={evento.nombreTenant} tone="org" size={26} />
              <span className="truncate font-grit-body text-xs font-medium text-grit-subtext">{evento.nombreTenant}</span>
            </span>
          ) : null}
          <h2 className="line-clamp-2 font-grit-title text-[34px] font-semibold italic leading-none text-grit-text sm:text-[44px]">{nombre}</h2>
        </div>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-col gap-5 px-5 py-6 sm:px-7">
        <div className="flex flex-wrap items-center gap-2.5">
          {countdown ? (
            <GritTag tone={countdown.pasado ? 'neutral' : 'accent'} icon="hourglass_top">
              {countdown.label}
            </GritTag>
          ) : null}
          <span className="font-grit-body text-[13px] font-medium text-grit-subtext">{formatFechaLarga(evento?.fechaHora ?? null)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field icon="confirmation_number" label="Entrada">
            {compra.entradaNombre}
            {compra.entradaTipo === 'multiple' ? <span className="ml-1 font-grit-body text-[11px] text-grit-cyan">Múltiple</span> : null}
          </Field>
          <Field icon="sell" label="Total">
            {compra.total === 0 ? 'Gratis' : formatCop(compra.total)}
          </Field>
          <Field icon="credit_card" label="Pago">
            {compra.metodoPago?.nombre ?? '—'}
          </Field>
          <Field icon="location_on" label="Lugar">
            {lugarUrl ? (
              <a href={lugarUrl} target="_blank" rel="noopener noreferrer" className="text-grit-cyan hover:underline">
                Ver ubicación
              </a>
            ) : (
              evento?.lugar || 'Por definir'
            )}
          </Field>
        </dl>

        {multiple ? (
          <ul aria-label="Códigos de las entradas" className="flex flex-col divide-y divide-white/[0.06] rounded-[16px] border border-white/[0.06] bg-white/[0.025]">
            {compra.tickets.map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between gap-3 px-3.5 py-2 font-grit-body text-xs">
                <span className="min-w-0 truncate text-grit-subtext">{ticket.eventoNombre ?? 'Evento incluido'}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {ticket.ingresoAt ? (
                    <GritTag tone="neutral" icon="how_to_reg">
                      Usada
                    </GritTag>
                  ) : null}
                  <span
                    className={cx(
                      'font-grit-mono',
                      ticket.estado === 'anulada' ? 'text-grit-muted line-through' : 'font-semibold tracking-[1.5px] text-grit-cyan',
                    )}
                  >
                    {ticket.codigo}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {compra.estado === 'rechazada' && compra.motivoRechazo ? (
          <p className="rounded-grit-lg border border-grit-danger/30 bg-grit-danger/10 px-3 py-2 font-grit-body text-xs text-grit-danger">
            Motivo del rechazo: {compra.motivoRechazo}
          </p>
        ) : null}

        <PoliticaCancelacion horas={evento?.cancelacionAntelacionHoras ?? null} className="text-[11px] text-grit-muted" />

        <div className="mt-auto flex flex-wrap items-center gap-2">
          <GritButton size="sm" variant="secondary" icon="arrow_outward" href={`/portal/eventos/${compra.eventoId}`}>
            Ver evento
          </GritButton>
          {compra.estado === 'rechazada' ? (
            <GritButton size="sm" variant="outline-accent" icon="upload" onClick={() => abrir('reenviar')} disabled={pendiente !== undefined}>
              Reenviar comprobante
            </GritButton>
          ) : null}
          {puedeCancelar ? (
            <GritButton size="sm" variant="ghost" icon="event_busy" onClick={() => abrir('cancelar')} disabled={pendiente !== undefined}>
              Cancelar
            </GritButton>
          ) : null}
          {puedeDescargarPdf(compra) ? (
            <GritButton size="sm" icon="download" onClick={() => void descargar()} loading={descargando} loadingLabel="Generando…">
              Descargar PDF
            </GritButton>
          ) : null}
        </div>

        {descargaError ? (
          <p role="alert" className="font-grit-body text-xs text-grit-danger">
            {descargaError}
          </p>
        ) : null}
        {error && modal === null ? (
          <p role="alert" className="font-grit-body text-xs text-grit-danger">
            {error}
          </p>
        ) : null}
      </div>

      {/* Perforation */}
      <div aria-hidden="true" className="mx-6 border-t-2 border-dashed border-white/15 lg:mx-0 lg:my-6 lg:border-l-2 lg:border-t-0" />

      <MiCompraTicketStub compra={compra} />

      {modal === 'cancelar' ? (
        <CancelarCompraModal
          compra={compra}
          pending={pendiente === 'cancelar'}
          error={error}
          onClose={() => setModal(null)}
          onConfirm={() => {
            void onCancelar().then((ok) => {
              if (ok) setModal(null);
            });
          }}
        />
      ) : null}
      {modal === 'reenviar' ? (
        <ReenviarComprobanteModal
          compra={compra}
          pending={pendiente === 'reenviar'}
          error={error}
          onClose={() => setModal(null)}
          onSubmit={(file) => {
            void onReenviar(file).then((ok) => {
              if (ok) setModal(null);
            });
          }}
        />
      ) : null}
    </GritCard>
  );
}
