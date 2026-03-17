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
    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
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
    <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
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
    <div className="flex items-center gap-3 rounded-lg bg-navy-deep/55 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200 truncate">{metodo.nombre}</span>
          <TipoBadge tipo={metodo.tipo} />
          <StatusBadge activo={metodo.activo} />
        </div>
        {metodo.valor ? (
          <p className="mt-0.5 text-xs text-slate-400 truncate">{metodo.valor}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {metodo.url ? (
          <a
            href={metodo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-soft hover:text-turquoise"
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
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-soft hover:text-slate-200"
          title="Editar"
        >
          <span className="material-symbols-outlined text-base" aria-hidden="true">
            edit
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDelete(metodo)}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-navy-soft hover:text-rose-300"
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
      <article className="overflow-hidden rounded-lg border border-portal-border bg-navy-medium/95 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
        <header className="flex items-center justify-between border-b border-portal-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              className="material-symbols-outlined rounded-full bg-primary/20 p-2 text-[18px] text-primary"
              aria-hidden="true"
            >
              payments
            </span>
            <h3 className="text-base font-semibold text-slate-100">Métodos de Pago</h3>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-turquoise px-3 py-1.5 text-xs font-semibold text-navy-deep transition hover:bg-turquoise/90"
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
              <span className="material-symbols-outlined animate-spin text-2xl text-slate-400" aria-hidden="true">
                progress_activity
              </span>
            </div>
          ) : error && metodos.length === 0 ? (
            <div
              className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {error}
            </div>
          ) : metodos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span
                className="material-symbols-outlined text-3xl text-slate-500"
                aria-hidden="true"
              >
                credit_card_off
              </span>
              <p className="text-sm text-slate-400">
                No hay métodos de pago configurados.
              </p>
              <p className="text-xs text-slate-500">
                Agrega un método para que los usuarios puedan seleccionarlo al suscribirse.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {error ? (
                <div
                  className="mb-2 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
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
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeDelete}
            aria-hidden="true"
          />
          <div
            className="glass relative z-10 mx-4 w-full max-w-md rounded-xl border border-portal-border p-6 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-mp-title"
          >
            <h2 id="delete-mp-title" className="text-lg font-semibold text-slate-100">
              Eliminar método de pago
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              ¿Deseas eliminar <span className="font-semibold text-slate-100">{deleteTarget.nombre}</span>?
              Los pagos asociados conservarán su registro, pero perderán la referencia a este método.
            </p>

            {error ? (
              <div
                className="mt-3 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
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
                className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
