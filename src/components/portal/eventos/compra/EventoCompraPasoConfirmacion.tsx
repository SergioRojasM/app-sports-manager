'use client';

import { useState } from 'react';
import { GritButton, GritIcon, cx } from '@/components/ui';
import { compraResultadoToPdf, nombreArchivoPdf } from '@/lib/portal/eventos-compra.utils';
import { descargarEntradasPdf } from '@/lib/portal/eventos-ticket-pdf';
import type { CompraResultado } from '@/types/portal/eventos-compras.types';
import { PoliticaCancelacion } from './PoliticaCancelacion';

type EventoCompraPasoConfirmacionProps = {
  resultado: CompraResultado;
  esUsuario: boolean;
  headingId: string;
};

export const CREAR_CUENTA_MIS_ENTRADAS_HREF = `/auth/signup?next=${encodeURIComponent('/portal/mis-entradas')}`;

/**
 * Step 4. Everything comes from the RPC response, so a guest downloads the PDF without another request
 * (US-0121). Guests are told to create an account with the same email to see the ticket later.
 */
export function EventoCompraPasoConfirmacion({ resultado, esUsuario, headingId }: EventoCompraPasoConfirmacionProps) {
  const [descargando, setDescargando] = useState(false);
  const [descargaError, setDescargaError] = useState<string | null>(null);
  const confirmada = resultado.estado === 'confirmada';

  const descargar = async () => {
    setDescargando(true);
    setDescargaError(null);
    try {
      const principal = resultado.tickets[0];
      await descargarEntradasPdf(
        compraResultadoToPdf(resultado),
        nombreArchivoPdf(principal?.eventoNombre ?? 'evento', principal?.codigo ?? resultado.compraId.slice(0, 8)),
      );
    } catch (error) {
      console.error('EventoCompraPasoConfirmacion: PDF failed', error);
      setDescargaError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div role="status" className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className={cx(
            'flex h-14 w-14 items-center justify-center rounded-full',
            confirmada ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200',
          )}
        >
          <GritIcon name={confirmada ? 'check_circle' : 'hourglass_top'} size={30} />
        </span>
        <h3 id={headingId} tabIndex={-1} className="font-grit-title text-lg font-bold text-grit-text outline-none">
          {confirmada ? '¡Entrada confirmada!' : 'Compra recibida: el organizador validará tu pago'}
        </h3>
        {!confirmada && (
          <p className="font-grit-body text-xs text-grit-subtext">
            Tu entrada queda pendiente hasta que el organizador valide el comprobante. No es válida para ingresar mientras tanto.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {resultado.tickets.map((ticket) => (
          <li
            key={ticket.id}
            className="flex items-center justify-between gap-3 rounded-grit-lg border border-grit-glass-border bg-grit-card px-3 py-2.5"
          >
            <span className="min-w-0 truncate font-grit-body text-sm text-grit-text">{ticket.eventoNombre}</span>
            <span className="shrink-0 font-mono text-sm font-bold tracking-wider text-grit-cyan">{ticket.codigo}</span>
          </li>
        ))}
      </ul>

      <PoliticaCancelacion horas={resultado.cancelacionAntelacionHoras} />

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <GritButton icon="download" onClick={() => void descargar()} loading={descargando} loadingLabel="Generando PDF…">
          Descargar entrada (PDF)
        </GritButton>
        {esUsuario && (
          <GritButton variant="secondary" href="/portal/mis-entradas" icon="confirmation_number">
            Ver mis entradas
          </GritButton>
        )}
      </div>
      {descargaError && (
        <p role="alert" className="text-center font-grit-body text-xs text-grit-danger">
          {descargaError}
        </p>
      )}

      {!esUsuario && (
        <div className="flex flex-col gap-3 rounded-grit-lg border border-grit-cyan/40 bg-grit-cyan/[0.08] p-4">
          <p className="font-grit-body text-sm text-grit-text">
            Guarda tu entrada. Para volver a verla o consultar el estado de tu pago, crea una cuenta con{' '}
            <strong className="break-words">{resultado.compradorEmail}</strong>.
          </p>
          <GritButton variant="outline-accent" size="sm" href={CREAR_CUENTA_MIS_ENTRADAS_HREF} icon="person_add" className="w-fit">
            Crear mi cuenta
          </GritButton>
        </div>
      )}
    </div>
  );
}
