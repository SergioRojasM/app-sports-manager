'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { GritButton, GritEmptyState, GritIcon, GritPageHeader, cx, gritInputClass, gritSelectClass } from '@/components/ui';
import { useEventoCompras } from '@/hooks/portal/gestion-eventos/useEventoCompras';
import { useValidarCompraEvento } from '@/hooks/portal/gestion-eventos/useValidarCompraEvento';
import { formatEventoFecha, formatEventoHora } from '@/lib/portal/eventos.utils';
import { eventoComprasService } from '@/services/supabase/portal/eventos-compras.service';
import {
  EVENTO_COMPRA_ESTADOS,
  EVENTO_COMPRA_ESTADO_LABELS,
  type CompraAdminItem,
  type EventoComprasEstadoFiltro,
} from '@/types/portal/eventos-compras.types';
import { EventoModalShell } from '../EventoModalShell';
import { CompraDatosModal } from './CompraDatosModal';
import { EventoComprasStats } from './EventoComprasStats';
import { EventoComprasTable } from './EventoComprasTable';
import { RechazarCompraModal } from './RechazarCompraModal';
import { ValidarCompraModal } from './ValidarCompraModal';

type EventoComprasPageProps = {
  tenantId: string;
  eventoId: string;
};

type ModalState =
  | { kind: 'datos'; compra: CompraAdminItem }
  | { kind: 'validar'; compra: CompraAdminItem }
  | { kind: 'rechazar'; compra: CompraAdminItem }
  | { kind: 'imagen'; url: string; compra: CompraAdminItem }
  | null;

/** Admin "Compras" page of one event: sold count, stats, purchases and payment validation (US-0121). */
export function EventoComprasPage({ tenantId, eventoId }: EventoComprasPageProps) {
  const compras = useEventoCompras(tenantId, eventoId);
  const [modal, setModal] = useState<ModalState>(null);
  const [abriendoComprobanteId, setAbriendoComprobanteId] = useState<string | null>(null);
  const [archivoError, setArchivoError] = useState<string | null>(null);

  const { refrescar } = compras;
  const onSuccess = useCallback(() => {
    setModal(null);
    refrescar();
  }, [refrescar]);
  const validacion = useValidarCompraEvento({ onSuccess });

  const listadoHref = `/portal/orgs/${tenantId}/gestion-eventos`;
  const { evento } = compras;

  const abrirModal = (next: ModalState) => {
    validacion.resetError();
    setModal(next);
  };

  /** PDFs open in a new tab; images are shown inline. Links last 300 s. */
  const verComprobante = async (compra: CompraAdminItem) => {
    if (!compra.comprobantePath) return;
    setArchivoError(null);
    const esPdf = compra.comprobantePath.toLowerCase().endsWith('.pdf');
    // Opened synchronously so the browser does not treat it as a popup
    const tab = esPdf ? window.open('', '_blank') : null;
    setAbriendoComprobanteId(compra.id);
    try {
      const url = await eventoComprasService.getArchivoUrl(compra.comprobantePath);
      if (esPdf) {
        if (tab) tab.location.href = url;
        else window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setModal({ kind: 'imagen', url, compra });
      }
    } catch {
      tab?.close();
      setArchivoError('No se pudo abrir el comprobante.');
    } finally {
      setAbriendoComprobanteId(null);
    }
  };

  const abrirArchivo = async (path: string) => {
    const tab = window.open('', '_blank');
    try {
      const url = await eventoComprasService.getArchivoUrl(path);
      if (tab) tab.location.href = url;
      else window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      tab?.close();
      throw error;
    }
  };

  if (compras.loading) {
    return <GritEmptyState icon="hourglass_top" title="Cargando compras…" />;
  }

  if (compras.error || compras.notFound || !evento) {
    return (
      <GritEmptyState
        icon={compras.error ? 'error' : 'search_off'}
        title={compras.error ? 'No se pudieron cargar las compras' : 'Evento no encontrado'}
        description={compras.error ?? 'El evento no existe o no pertenece a esta organización.'}
        descriptionClassName={compras.error ? 'text-grit-danger' : undefined}
        action={
          compras.error ? (
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={compras.recargar}>
              Reintentar
            </GritButton>
          ) : (
            <GritButton variant="secondary" size="sm" href={listadoHref}>
              Volver a eventos
            </GritButton>
          )
        }
      />
    );
  }

  const hora = formatEventoHora(evento.fecha_hora);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={listadoHref}
        className="inline-flex w-fit items-center gap-1 font-grit-body text-[13px] font-semibold text-grit-subtext transition hover:text-grit-cyan"
      >
        <GritIcon name="arrow_back" size={15} />
        Volver a eventos
      </Link>

      <GritPageHeader
        eyebrow="Compras"
        title={evento.nombre}
        subtitle={`${formatEventoFecha(evento.fecha_hora)}${hora ? ` · ${hora}` : ''}`}
        actions={
          <span className="rounded-grit-md border border-grit-glass-border bg-grit-card px-4 py-2.5 font-grit-body text-sm font-semibold text-grit-text">
            Vendidas: {compras.vendidas} / {evento.cupo_maximo ?? 'ilimitado'}
          </span>
        }
      />

      <EventoComprasStats stats={compras.stats} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext">
          Buscar
          <input
            type="search"
            value={compras.search}
            onChange={(event) => compras.setSearch(event.target.value)}
            placeholder="Nombre o correo del comprador"
            className={gritInputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 font-grit-body text-xs font-semibold text-grit-subtext sm:w-56">
          Estado
          <select
            value={compras.estado}
            onChange={(event) => compras.setEstado(event.target.value as EventoComprasEstadoFiltro)}
            className={gritSelectClass}
          >
            <option value="todos">Todos</option>
            {EVENTO_COMPRA_ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {EVENTO_COMPRA_ESTADO_LABELS[estado]}
              </option>
            ))}
          </select>
        </label>
        {compras.hayFiltros && (
          <GritButton variant="ghost" size="sm" onClick={compras.limpiarFiltros}>
            Limpiar filtros
          </GritButton>
        )}
      </div>

      {archivoError && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 font-grit-body text-xs text-grit-danger">
          {archivoError}
        </p>
      )}

      {compras.compras.length === 0 ? (
        <GritEmptyState icon="receipt_long" title="Aún no hay compras" description="Las compras de este evento aparecerán aquí." />
      ) : compras.filtradas.length === 0 ? (
        <p className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-4 font-grit-body text-sm text-grit-subtext">
          Ninguna compra coincide con los filtros.
        </p>
      ) : (
        <EventoComprasTable
          compras={compras.paginadas}
          currentPage={compras.currentPage}
          totalPages={compras.totalPages}
          pageSize={compras.pageSize}
          totalFiltered={compras.filtradas.length}
          onPageChange={compras.setCurrentPage}
          onVerComprobante={(compra) => void verComprobante(compra)}
          onVerDatos={(compra) => abrirModal({ kind: 'datos', compra })}
          onValidar={(compra) => abrirModal({ kind: 'validar', compra })}
          onRechazar={(compra) => abrirModal({ kind: 'rechazar', compra })}
          abriendoComprobanteId={abriendoComprobanteId}
        />
      )}

      {modal?.kind === 'datos' && (
        <CompraDatosModal compra={modal.compra} onAbrirArchivo={abrirArchivo} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'validar' && (
        <ValidarCompraModal
          compra={modal.compra}
          isSubmitting={validacion.isSubmitting}
          error={validacion.error}
          onConfirm={() => void validacion.validar(modal.compra.id)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'rechazar' && (
        <RechazarCompraModal
          compra={modal.compra}
          isSubmitting={validacion.isSubmitting}
          error={validacion.error}
          onConfirm={(motivo) => void validacion.rechazar(modal.compra.id, motivo)}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.kind === 'imagen' && (
        <EventoModalShell
          title={`Comprobante · ${modal.compra.compradorNombre}`}
          onClose={() => setModal(null)}
          footer={
            <GritButton variant="secondary" size="sm" onClick={() => setModal(null)}>
              Cerrar
            </GritButton>
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={modal.url}
            alt={`Comprobante de pago de ${modal.compra.compradorNombre}`}
            className={cx('max-h-[60vh] w-full rounded-grit-md border border-grit-glass-border object-contain')}
          />
        </EventoModalShell>
      )}
    </div>
  );
}
