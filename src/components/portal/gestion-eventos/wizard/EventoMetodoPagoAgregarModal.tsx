'use client';

import { useCallback, useMemo, useState } from 'react';
import { GritButton, GritIcon, cx, gritFocusRing } from '@/components/ui';
import { BodyPortal, EventoModalShell } from '../EventoModalShell';
import { MetodoPagoFormModal } from '@/components/portal/tenant/MetodoPagoFormModal';
import { createClient } from '@/services/supabase/client';
import { storageService } from '@/services/supabase/portal/storage.service';
import type { EventoMetodoPagoSnapshot } from '@/types/portal/eventos.types';
import {
  METODO_PAGO_TIPO_LABELS,
  type CreateMetodoPagoInput,
  type MetodoPago,
  type MetodoPagoQrChange,
  type UpdateMetodoPagoInput,
} from '@/types/portal/metodos-pago.types';

type EventoMetodoPagoAgregarModalProps = {
  tenantId: string;
  /** Tenant methods that can still be added to the target list. */
  disponibles: MetodoPago[];
  /** Event-only method being edited; null to add a method. */
  editando: EventoMetodoPagoSnapshot | null;
  onAdd: (metodo: EventoMetodoPagoSnapshot) => void;
  onUpdate: (metodo: EventoMetodoPagoSnapshot) => void;
  onClose: () => void;
};

export function toMetodoPagoSnapshot(metodo: MetodoPago): EventoMetodoPagoSnapshot {
  return {
    id: metodo.id,
    nombre: metodo.nombre,
    tipo: metodo.tipo,
    valor: metodo.valor,
    url: metodo.url,
    comentarios: metodo.comentarios,
    qr_url: metodo.qr_url ?? null,
    origen: 'tenant',
  };
}

/**
 * "Agregar método de pago" (US-0130): pick one of the tenant's methods, or create one that only
 * exists in this event's snapshot — it is never written to `tenant_metodos_pago`.
 */
export function EventoMetodoPagoAgregarModal({
  tenantId,
  disponibles,
  editando,
  onAdd,
  onUpdate,
  onClose,
}: EventoMetodoPagoAgregarModalProps) {
  const [creando, setCreando] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stable identity: the form resets itself whenever `editTarget` changes
  const editTarget = useMemo<MetodoPago | null>(
    () =>
      editando
        ? {
            id: editando.id,
            tenant_id: tenantId,
            nombre: editando.nombre,
            tipo: editando.tipo,
            valor: editando.valor,
            url: editando.url,
            comentarios: editando.comentarios,
            qr_url: editando.qr_url ?? null,
            activo: true,
            orden: 0,
            created_at: '',
            updated_at: '',
          }
        : null,
    [editando, tenantId],
  );

  const handleSubmit = useCallback(
    async (data: CreateMetodoPagoInput | UpdateMetodoPagoInput, qr: MetodoPagoQrChange) => {
      setSubmitting(true);
      setSubmitError(null);

      // The id only identifies the snapshot (checkout selection, QR path)
      const id = editando?.id ?? crypto.randomUUID();
      let qrUrl = editando?.qr_url ?? null;
      if (qr.file) {
        try {
          const { signedUrl } = await storageService.uploadMetodoPagoQr(createClient(), tenantId, id, qr.file);
          qrUrl = signedUrl;
        } catch {
          setSubmitError('No fue posible subir la imagen. Intenta de nuevo.');
          setSubmitting(false);
          return;
        }
      } else if (qr.remove) {
        qrUrl = null;
      }

      const metodo: EventoMetodoPagoSnapshot = {
        id,
        nombre: data.nombre ?? '',
        tipo: data.tipo ?? 'otro',
        valor: data.valor ?? null,
        url: data.url ?? null,
        comentarios: data.comentarios ?? null,
        qr_url: qrUrl,
        origen: 'evento',
      };

      if (editando) onUpdate(metodo);
      else onAdd(metodo);
      setSubmitting(false);
      onClose();
    },
    [editando, tenantId, onAdd, onUpdate, onClose],
  );

  if (editando || creando) {
    return (
      <BodyPortal>
        <MetodoPagoFormModal
          open
          variant="evento"
          tenantId={tenantId}
          editTarget={editTarget}
          isSubmitting={submitting}
          submitError={submitError}
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      </BodyPortal>
    );
  }

  return (
    <EventoModalShell
      title="Agregar método de pago"
      onClose={onClose}
      footer={
        <GritButton variant="secondary" onClick={onClose}>
          Cancelar
        </GritButton>
      }
    >
      <h3 className="font-grit-body text-xs font-semibold uppercase tracking-wide text-grit-muted">
        Elegir un método existente
      </h3>
      {disponibles.length === 0 ? (
        <p className="rounded-grit-md border border-dashed border-grit-glass-border p-3 text-sm text-grit-subtext">
          No hay más métodos de tu organización para agregar.
        </p>
      ) : (
        <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {disponibles.map((metodo) => (
            <li key={metodo.id}>
              <button
                type="button"
                onClick={() => {
                  onAdd(toMetodoPagoSnapshot(metodo));
                  onClose();
                }}
                className={cx(
                  'flex w-full items-start gap-3 rounded-grit-md border border-grit-glass-border bg-grit-card p-3 text-left transition hover:border-grit-cyan/60',
                  gritFocusRing,
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-grit-text">{metodo.nombre}</span>
                    <span className="rounded-full border border-grit-glass-border px-2 py-0.5 text-[10px] font-semibold uppercase text-grit-subtext">
                      {METODO_PAGO_TIPO_LABELS[metodo.tipo]}
                    </span>
                    {metodo.qr_url && (
                      <span
                        title="Tiene imagen QR"
                        className="inline-flex items-center gap-1 rounded-full border border-grit-glass-border px-2 py-0.5 text-[10px] font-semibold uppercase text-grit-subtext"
                      >
                        <GritIcon name="qr_code_2" size={12} />
                        QR
                      </span>
                    )}
                  </span>
                  {metodo.valor && <span className="block truncate text-xs text-grit-subtext">{metodo.valor}</span>}
                </span>
                <GritIcon name="add" size={18} className="mt-0.5 text-grit-cyan" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-3">
        <GritButton variant="outline-accent" icon="add_card" fullWidth onClick={() => setCreando(true)}>
          Crear un método solo para este evento
        </GritButton>
      </div>
    </EventoModalShell>
  );
}
