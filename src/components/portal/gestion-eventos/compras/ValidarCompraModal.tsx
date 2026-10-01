'use client';

import { GritButton } from '@/components/ui';
import { formatCop } from '@/lib/portal/eventos.utils';
import type { CompraAdminItem } from '@/types/portal/eventos-compras.types';
import { EventoModalShell } from '../EventoModalShell';

type ValidarCompraModalProps = {
  compra: CompraAdminItem;
  isSubmitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
};

/** Confirms the payment of an `en_validacion` purchase (US-0121). */
export function ValidarCompraModal({ compra, isSubmitting, error, onConfirm, onClose }: ValidarCompraModalProps) {
  return (
    <EventoModalShell
      title="Validar pago"
      onClose={onClose}
      busy={isSubmitting}
      footer={
        <>
          <GritButton variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton size="sm" icon="check" onClick={onConfirm} loading={isSubmitting} loadingLabel="Validando…">
            Validar pago
          </GritButton>
        </>
      }
    >
      <p>
        ¿Confirmas el pago de <strong className="text-grit-text">{compra.compradorNombre}</strong> por{' '}
        <strong className="text-grit-text">{formatCop(compra.total)}</strong>
        {compra.metodoPago ? ` (${compra.metodoPago.nombre})` : ''}?
      </p>
      <p>Sus entradas quedarán activas y podrá usarlas para ingresar.</p>
      {error && (
        <p role="alert" className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-3 py-2 text-xs text-grit-danger">
          {error}
        </p>
      )}
    </EventoModalShell>
  );
}
