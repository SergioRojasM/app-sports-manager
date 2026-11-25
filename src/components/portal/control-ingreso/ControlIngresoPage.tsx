'use client';

import { useCallback, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GritAlert, GritButton, GritEmptyState } from '@/components/ui';
import { useAsistentesIngreso } from '@/hooks/portal/control-ingreso/useAsistentesIngreso';
import { useControlIngreso } from '@/hooks/portal/control-ingreso/useControlIngreso';
import type { AsistenteIngreso } from '@/types/portal/eventos-compras.types';
import { AsistentesIngresoTable } from './AsistentesIngresoTable';
import { CodigoManualForm } from './CodigoManualForm';
import { IngresoResultadoCard } from './IngresoResultadoCard';
import { IngresoResumenHeader } from './IngresoResumenHeader';
import { RevertirIngresoModal } from './RevertirIngresoModal';
import { UltimosIngresos } from './UltimosIngresos';

// Camera + worker only on this page, never during SSR
const QrScanner = dynamic(() => import('./QrScanner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[384px] w-full items-center justify-center rounded-grit-2xl border border-white/[0.08] bg-white/[0.03] font-grit-body text-[13px] text-grit-subtext">
      Cargando lector…
    </div>
  ),
});

type ControlIngresoPageProps = {
  tenantId: string;
  eventoId: string;
};

/**
 * Door check-in screen of one event (US-0131, grit-arena-v3 `xjlmU`): header with counters, a scanner
 * column (camera, manual code, result, latest check-ins) and the attendee panel.
 */
export function ControlIngresoPage({ tenantId, eventoId }: ControlIngresoPageProps) {
  const [rowPendingId, setRowPendingId] = useState<string | null>(null);
  const lista = useAsistentesIngreso(eventoId, { pausado: rowPendingId !== null });
  const { refrescar } = lista;
  const control = useControlIngreso(tenantId, eventoId, { onChange: refrescar });

  const manualRef = useRef<HTMLInputElement>(null);
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
    <div className="flex flex-col gap-[18px]">
      <IngresoResumenHeader evento={control.evento} resumen={control.resumen} listadoHref={listadoHref} />

      <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <QrScanner onDetect={onDetect} onError={onCameraError} />

          <CodigoManualForm
            inputRef={manualRef}
            disabled={control.pending}
            onSubmit={(codigo) => {
              setCardError(null);
              void registrar(codigo, { force: true });
            }}
          />

          {control.error && (
            <GritAlert
              tone="danger"
              action={
                <GritButton variant="secondary" size="sm" icon="refresh" onClick={control.reintentar}>
                  Reintentar
                </GritButton>
              }
            >
              {control.error}
            </GritAlert>
          )}
          {cardError && <GritAlert tone="danger">{cardError}</GritAlert>}

          <IngresoResultadoCard
            resultado={control.resultado}
            pending={control.pending}
            onDeshacer={(ticketId) => void deshacerDesdeCard(ticketId)}
            onSiguiente={() => {
              setCardError(null);
              control.siguiente();
            }}
          />

          <UltimosIngresos recientes={lista.recientes} />
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
      </div>

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
