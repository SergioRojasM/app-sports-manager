'use client';

import { GritButton, GritConfirmDialog, GritIconButton, GritIconTile, GritTag } from '@/components/ui';
import { useMetodosPago } from '@/hooks/portal/tenant/useMetodosPago';
import { METODO_PAGO_TIPO_LABELS, type MetodoPago, type MetodoPagoTipo } from '@/types/portal/metodos-pago.types';
import { MetodoPagoFormModal } from './MetodoPagoFormModal';
import { SectionMessage, TenantSettingsSection } from './TenantSettingsSection';

type TenantPaymentMethodsCardProps = {
  tenantId: string;
};

const TIPO_ICON: Record<MetodoPagoTipo, string> = {
  transferencia: 'account_balance',
  efectivo: 'payments',
  tarjeta: 'credit_card',
  pasarela: 'link',
  otro: 'account_balance_wallet',
};

function MethodRow({
  metodo,
  onEdit,
  onDelete,
}: {
  metodo: MetodoPago;
  onEdit: (m: MetodoPago) => void;
  onDelete: (m: MetodoPago) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
      <GritIconTile icon={TIPO_ICON[metodo.tipo] ?? 'account_balance_wallet'} size={34} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-grit-body text-[13px] font-semibold text-grit-text">{metodo.nombre}</span>
          {metodo.valor ? <span className="truncate font-grit-body text-[11px] text-grit-muted">{metodo.valor}</span> : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <GritTag tone="neutral">{METODO_PAGO_TIPO_LABELS[metodo.tipo] ?? metodo.tipo}</GritTag>
          <GritTag tone={metodo.activo ? 'accent' : 'neutral'} dot>
            {metodo.activo ? 'Activo' : 'Pausado'}
          </GritTag>
          {metodo.qr_url ? (
            <span title="Tiene imagen QR">
              <GritTag tone="neutral" icon="qr_code_2">
                QR
              </GritTag>
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {metodo.url ? (
          <GritIconButton
            icon="open_in_new"
            label={`Abrir enlace de ${metodo.nombre}`}
            size="sm"
            variant="ghost"
            href={metodo.url}
            external
          />
        ) : null}
        <GritIconButton icon="edit" label={`Editar ${metodo.nombre}`} size="sm" variant="ghost" onClick={() => onEdit(metodo)} />
        <GritIconButton icon="delete" label={`Eliminar ${metodo.nombre}`} size="sm" variant="ghost" onClick={() => onDelete(metodo)} />
      </div>
    </li>
  );
}

/** "Métodos de pago" settings section (`aYwNn` `qS2AM`). */
export function TenantPaymentMethodsCard({ tenantId }: TenantPaymentMethodsCardProps) {
  const {
    metodos,
    loading,
    error,
    formOpen,
    editTarget,
    deleteTarget,
    isSubmitting,
    openCreate,
    openEdit,
    closeForm,
    submitForm,
    openDelete,
    closeDelete,
    confirmDelete,
    reload,
  } = useMetodosPago({ tenantId });

  const showListError = Boolean(error) && !formOpen && !deleteTarget;

  return (
    <>
      <TenantSettingsSection
        icon="account_balance_wallet"
        title="Métodos de pago"
        subtitle="Cómo te pagan tus atletas."
        action={
          <GritButton size="sm" variant="outline-accent" icon="add" onClick={openCreate}>
            Agregar
          </GritButton>
        }
      >
        {loading ? (
          <SectionMessage kind="loading" title="Cargando métodos de pago…" />
        ) : showListError && metodos.length === 0 ? (
          <SectionMessage kind="error" title={error} onRetry={() => void reload()} />
        ) : metodos.length === 0 ? (
          <SectionMessage
            kind="empty"
            icon="credit_card_off"
            title="No hay métodos de pago configurados."
            description="Agrega uno para que tus usuarios puedan realizar pagos."
          />
        ) : (
          <>
            {showListError ? <SectionMessage kind="error" title={error} onRetry={() => void reload()} /> : null}
            <ul className="flex flex-col gap-2">
              {metodos.map((m) => (
                <MethodRow key={m.id} metodo={m} onEdit={openEdit} onDelete={openDelete} />
              ))}
            </ul>
          </>
        )}
      </TenantSettingsSection>

      <MetodoPagoFormModal
        open={formOpen}
        tenantId={tenantId}
        editTarget={editTarget}
        isSubmitting={isSubmitting}
        submitError={formOpen ? error : null}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      <GritConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar método de pago"
        message={
          <>
            ¿Deseas eliminar <span className="font-semibold text-grit-text">{deleteTarget?.nombre}</span>? Los pagos
            asociados conservarán su registro, pero perderán la referencia a este método.
          </>
        }
        pending={isSubmitting}
        error={deleteTarget ? error : null}
        onCancel={closeDelete}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
