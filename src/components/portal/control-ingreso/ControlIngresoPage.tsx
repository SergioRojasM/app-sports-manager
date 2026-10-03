'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { GritButton, GritEmptyState, GritIcon } from '@/components/ui';
import { useAsistentesIngreso } from '@/hooks/portal/control-ingreso/useAsistentesIngreso';
import { useControlIngreso } from '@/hooks/portal/control-ingreso/useControlIngreso';
import type { AsistenteIngreso } from '@/types/portal/eventos-compras.types';
import { AsistentesIngresoTable } from './AsistentesIngresoTable';
import { CodigoManualForm } from './CodigoManualForm';
import { IngresoResultadoCard } from './IngresoResultadoCard';
import { IngresoResumenHeader } from './IngresoResumenHeader';
import { RevertirIngresoModal } from './RevertirIngresoModal';

// Camera + worker only on this page, never during SSR
const QrScanner = dynamic(() => import('./QrScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-40 w-full items-center justify-center rounded-grit-2xl border border-grit-glass-border bg-black font-grit-body text-sm text-grit-subtext">
      Cargando lector…
    </div>
  ),
});

type ControlIngresoPageProps = {
  tenantId: string;
  eventoId: string;
};

/** Door check-in screen of one event: scanner, manual entry, result, counters and attendees (US-0131). */
export function ControlIngresoPage({ tenantId, eventoId }: ControlIngresoPageProps) {
  const lista = useAsistentesIngreso(eventoId);
  const { refrescar } = lista;
  const control = useControlIngreso(tenantId, eventoId, { onChange: refrescar });

  const manualRef = useRef<HTMLInputElement>(null);
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);
  const [revertirTarget, setRevertirTarget] = useState<AsistenteIngreso | null>(null);
  const [revertirError, setRevertirError] = useState<string | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);

  const listadoHref = `/portal/orgs/${tenantId}/control-ingreso`;
  const { registrar, revertir } = control;

  const onDetect = useCallback((codigo: string) => void registrar(codigo), [registrar]);
  const onCameraError = useCallback(() => manualRef.current?.focus(), []);

  const registrarDesdeLista = async (asistente: AsistenteIngreso) => {
    setRowPendingId(asistente.ticketId);
    await registrar(asistente.codigo, { force: true });
    setRowPendingId(null);
  };

  const deshacerDesdeCard = async (ticketId: string) => {
    setCardError(null);
    const result = await revertir(ticketId);
    if (!result.ok) setCardError(result.error);
  };

  const confirmarRevertir = async () => {
    if (!revertirTarget) return;
    setRevertirError(null);
    const result = await revertir(revertirTarget.ticketId);
    if (result.ok) setRevertirTarget(null);
    else setRevertirError(result.error);
  };

  if (control.loading) {
    return <GritEmptyState icon="hourglass_top" title="Cargando evento…" />;
  }

  if (control.loadError || control.notFound || !control.evento) {
    return (
      <GritEmptyState
        icon={control.loadError ? 'error' : 'search_off'}
        title={control.loadError ? 'No se pudo cargar el evento' : 'Evento no encontrado'}
        description={control.loadError ?? 'El evento no existe o no pertenece a esta organización.'}
        descriptionClassName={control.loadError ? 'text-grit-danger' : undefined}
        action={
          control.loadError ? (
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={control.recargar}>
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

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={listadoHref}
        className="inline-flex w-fit items-center gap-1 font-grit-body text-[13px] font-semibold text-grit-subtext transition hover:text-grit-cyan"
      >
        <GritIcon name="arrow_back" size={15} />
        Volver a eventos
      </Link>

      <IngresoResumenHeader nombre={control.evento.nombre} fechaHora={control.evento.fecha_hora} resumen={control.resumen} />

      <div className="grid gap-6 lg:grid-cols-2">
        <QrScanner onDetect={onDetect} onError={onCameraError} />

        <div className="flex flex-col gap-4">
          <CodigoManualForm
            inputRef={manualRef}
            disabled={control.pending}
            onSubmit={(codigo) => {
              setCardError(null);
              void registrar(codigo, { force: true });
            }}
          />

          {control.error && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 font-grit-body text-xs text-grit-danger"
            >
              {control.error}
              <GritButton variant="secondary" size="sm" icon="refresh" onClick={control.reintentar}>
                Reintentar
              </GritButton>
            </div>
          )}
          {cardError && (
            <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 font-grit-body text-xs text-grit-danger">
              {cardError}
            </p>
          )}

          <IngresoResultadoCard
            resultado={control.resultado}
            pending={control.pending}
            onDeshacer={(ticketId) => void deshacerDesdeCard(ticketId)}
            onSiguiente={() => {
              setCardError(null);
              control.siguiente();
            }}
          />
        </div>
      </div>

      <AsistentesIngresoTable
        lista={lista}
        pendingTicketId={rowPendingId}
        onRegistrar={(asistente) => void registrarDesdeLista(asistente)}
        onRevertir={(asistente) => {
          setRevertirError(null);
          setRevertirTarget(asistente);
        }}
      />

      {revertirTarget && (
        <RevertirIngresoModal
          asistente={revertirTarget}
          isSubmitting={control.pending}
          error={revertirError}
          onConfirm={() => void confirmarRevertir()}
          onClose={() => setRevertirTarget(null)}
        />
      )}
    </div>
  );
}
