'use client';

import { useMetodosPago } from '@/hooks/portal/tenant/useMetodosPago';
import { MetodoPagoFormModal } from './MetodoPagoFormModal';
import type { MetodoPago } from '@/types/portal/metodos-pago.types';

type TenantPaymentMethodsCardProps = {
  tenantId: string;
};

const TIPO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  pasarela: 'Pasarela',
  otro: 'Otro',
};

function TipoBadge({ tipo }: { tipo: string }) {
  return (
    <span className="rounded-full bg-grit-cyan/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-grit-cyan">
      {TIPO_LABELS[tipo] ?? tipo}
    </span>
  );
}

function StatusBadge({ activo }: { activo: boolean }) {
  return activo ? (
    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-400">
      Activo
    </span>
  ) : (
    <span className="rounded-full bg-grit-subtext/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-grit-subtext">
      Inactivo
    </span>
  );
}

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
    <div className="flex items-center gap-3 rounded-grit-md bg-grit-bg/55 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-grit-text truncate">{metodo.nombre}</span>
          <TipoBadge tipo={metodo.tipo} />
          <StatusBadge activo={metodo.activo} />
        </div>
        {metodo.valor ? (
          <p className="mt-0.5 text-xs text-grit-subtext truncate">{metodo.valor}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {metodo.url ? (
          <a
            href={metodo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-cyan"
            title="Abrir enlace"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              open_in_new
            </span>
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => onEdit(metodo)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-text"
          title="Editar"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(metodo)}
          className="rounded-grit-md p-1.5 text-grit-subtext transition hover:bg-grit-cyan/10 hover:text-grit-danger"
          title="Eliminar"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            delete
          </span>
        </button>
      </div>
    </div>
  );
}

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
  } = useMetodosPago({ tenantId });

  return (
    <>
      <article className="overflow-hidden rounded-grit-md border border-grit-glass-border bg-grit-card shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <header className="flex items-center justify-between border-b border-grit-glass-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined rounded-full bg-grit-cyan/20 p-2 text-[18px] text-grit-cyan"
              aria-hidden="true"
            >
              payments
            </span>
            <h3 className="font-grit-title text-base font-semibold text-grit-text">Métodos de Pago</h3>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-grit-md bg-grit-cyan px-3 py-1.5 text-xs font-semibold text-grit-bg transition hover:bg-grit-cyan/90"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">
              add
            </span>
            Agregar
          </button>
        </header>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-2xl text-grit-subtext" aria-hidden="true">
                progress_activity
              </span>
            </div>
          ) : error && metodos.length === 0 ? (
            <div
              className="rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
              role="alert"
            >
              {error}
            </div>
          ) : metodos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span
                className="material-symbols-outlined text-3xl text-grit-muted"
                aria-hidden="true"
              >
                credit_card_off
              </span>
              <p className="text-sm text-grit-subtext">
                No hay métodos de pago configurados.
              </p>
              <p className="text-xs text-grit-muted">
                Agrega un método para que los usuarios puedan seleccionarlo al suscribirse.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {error ? (
                <div
                  className="mb-2 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
                  role="alert"
                >
                  {error}
                </div>
              ) : null}
              {metodos.map((m) => (
                <MethodRow key={m.id} metodo={m} onEdit={openEdit} onDelete={openDelete} />
              ))}
            </div>
          )}
        </div>
      </article>

      {/* Form Modal */}
      <MetodoPagoFormModal
        open={formOpen}
        tenantId={tenantId}
        editTarget={editTarget}
        isSubmitting={isSubmitting}
        submitError={formOpen ? error : null}
        onClose={closeForm}
        onSubmit={submitForm}
      />

      {/* Delete Confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
            onClick={closeDelete}
            aria-hidden="true"
          />
          <div
            className="border bg-grit-glass backdrop-blur-md relative z-10 mx-4 w-full max-w-md rounded-grit-2xl border-grit-glass-border p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-mp-title"
          >
            <h2 id="delete-mp-title" className="font-grit-title text-lg font-semibold text-grit-text">
              Eliminar método de pago
            </h2>
            <p className="mt-2 text-sm text-grit-subtext">
              ¿Deseas eliminar <span className="font-semibold text-grit-text">{deleteTarget.nombre}</span>?
              Los pagos asociados conservarán su registro, pero perderán la referencia a este método.
            </p>

            {error ? (
              <div
                className="mt-3 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger"
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDelete}
                disabled={isSubmitting}
                className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-grit-md bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Eliminando...' : 'Eliminar'}
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  delete
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
