'use client';

import { useState } from 'react';
import { GritButton, GritIcon } from '@/components/ui';
import { EventoCompraEstadoBadge, PoliticaCancelacion } from '@/components/portal/eventos/compra';
import { formatCop, formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { toHttpUrl } from '@/lib/portal/eventos-publicos.utils';
import { miCompraToPdf, nombreArchivoPdf, puedeDescargarPdf } from '@/lib/portal/eventos-compra.utils';
import { descargarEntradasPdf } from '@/lib/portal/eventos-ticket-pdf';
import type { MiCompra } from '@/types/portal/eventos-compras.types';
import { CancelarCompraModal } from './CancelarCompraModal';
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

/** One purchase in "Mis Entradas" (US-0121). */
export function MiCompraCard({ compra, puedeCancelar, pendiente, error, onCancelar, onReenviar, onLimpiarError }: MiCompraCardProps) {
  const [modal, setModal] = useState<'cancelar' | 'reenviar' | null>(null);
  const [bannerError, setBannerError] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [descargaError, setDescargaError] = useState<string | null>(null);

  const evento = compra.evento;
  const nombre = evento?.nombre ?? 'Evento no disponible';
  const hora = evento?.fechaHora ? formatEventoHora(evento.fechaHora) : '';
  const lugarUrl = toHttpUrl(evento?.lugar);
  const multiple = compra.tickets.length > 1;

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
    <article className="flex flex-col overflow-hidden rounded-grit-2xl border border-grit-glass-border bg-grit-card sm:flex-row">
      <div className="relative h-32 w-full shrink-0 bg-gradient-to-br from-grit-cyan/25 via-grit-card to-grit-bg sm:h-auto sm:w-48">
        {evento?.bannerUrl && !bannerError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={evento.bannerUrl} alt="" className="h-full w-full object-cover" onError={() => setBannerError(true)} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-grit-cyan/70">
            <GritIcon name="confirmation_number" size={40} />
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-grit-title text-lg font-bold text-grit-text">{nombre}</h2>
            <p className="font-grit-body text-xs text-grit-subtext">
              {[
                evento?.nombreTenant,
                evento ? formatEventoFecha(evento.fechaHora) + (hora ? ` · ${hora}` : '') : null,
                lugarUrl ? null : evento?.lugar,
              ]
                .filter(Boolean)
                .join(' · ')}
              {lugarUrl && (
                <>
                  {' · '}
                  <a href={lugarUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-grit-cyan hover:underline">
                    Ver ubicación
                  </a>
                </>
              )}
            </p>
          </div>
          <EventoCompraEstadoBadge estado={compra.estado} />
        </div>

        <dl className="grid gap-x-4 gap-y-1 font-grit-body text-xs sm:grid-cols-3">
          <div>
            <dt className="text-grit-muted">Entrada</dt>
            <dd className="font-semibold text-grit-text">
              {compra.entradaNombre}
              {compra.entradaTipo === 'multiple' && <span className="ml-1 text-grit-cyan">(Múltiple)</span>}
            </dd>
          </div>
          <div>
            <dt className="text-grit-muted">Total</dt>
            <dd className="font-semibold text-grit-text">{compra.total === 0 ? 'Gratis' : formatCop(compra.total)}</dd>
          </div>
          <div>
            <dt className="text-grit-muted">Método de pago</dt>
            <dd className="font-semibold text-grit-text">{compra.metodoPago?.nombre ?? '—'}</dd>
          </div>
        </dl>

        {compra.tickets.length > 0 && (
          <ul className="flex flex-col gap-1">
            {compra.tickets.map((ticket) => (
              <li
                key={ticket.id}
                className="flex items-center justify-between gap-3 rounded-grit-md border border-grit-glass-border bg-grit-bg/40 px-3 py-1.5 font-grit-body text-xs"
              >
                <span className="min-w-0 truncate text-grit-subtext">
                  {multiple ? (ticket.eventoNombre ?? 'Evento incluido') : 'Código'}
                </span>
                <span className={ticket.estado === 'anulada' ? 'font-mono text-grit-muted line-through' : 'font-mono font-bold tracking-wider text-grit-cyan'}>
                  {ticket.codigo}
                </span>
              </li>
            ))}
          </ul>
        )}

        {compra.estado === 'rechazada' && compra.motivoRechazo && (
          <p className="rounded-grit-md border border-grit-danger/30 bg-rose-500/10 px-3 py-2 font-grit-body text-xs text-grit-danger">
            Motivo del rechazo: {compra.motivoRechazo}
          </p>
        )}

        <PoliticaCancelacion horas={evento?.cancelacionAntelacionHoras ?? null} />

        <div className="flex flex-wrap gap-2">
          {puedeDescargarPdf(compra) && (
            <GritButton size="sm" icon="download" onClick={() => void descargar()} loading={descargando} loadingLabel="Generando…">
              Descargar PDF
            </GritButton>
          )}
          {compra.estado === 'rechazada' && (
            <GritButton size="sm" variant="outline-accent" icon="upload" onClick={() => abrir('reenviar')} disabled={pendiente !== undefined}>
              Reenviar comprobante
            </GritButton>
          )}
          {puedeCancelar && (
            <GritButton size="sm" variant="secondary" icon="event_busy" onClick={() => abrir('cancelar')} disabled={pendiente !== undefined}>
              Cancelar
            </GritButton>
          )}
          <GritButton size="sm" variant="ghost" icon="open_in_new" href={`/portal/eventos/${compra.eventoId}`}>
            Ver evento
          </GritButton>
        </div>

        {descargaError && (
          <p role="alert" className="font-grit-body text-xs text-grit-danger">
            {descargaError}
          </p>
        )}
        {error && modal === null && (
          <p role="alert" className="font-grit-body text-xs text-grit-danger">
            {error}
          </p>
        )}
      </div>

      {modal === 'cancelar' && (
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
      )}
      {modal === 'reenviar' && (
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
      )}
    </article>
  );
}
