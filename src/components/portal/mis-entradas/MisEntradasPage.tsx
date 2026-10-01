'use client';

import { GritButton, GritEmptyState, GritPageHeader, cx, gritSelectClass } from '@/components/ui';
import { useMisEntradas } from '@/hooks/portal/mis-entradas/useMisEntradas';
import {
  EVENTO_COMPRA_ESTADOS,
  EVENTO_COMPRA_ESTADO_LABELS,
  type EventoCompraEstado,
  type MisEntradasTab,
} from '@/types/portal/eventos-compras.types';
import { MiCompraCard } from './MiCompraCard';

const TABS: { id: MisEntradasTab; label: string }[] = [
  { id: 'proximas', label: 'Próximas' },
  { id: 'pasadas', label: 'Pasadas' },
];

/**
 * "Mis Entradas" (US-0121): the user's event purchases across organizations. Guest purchases made
 * with the account's verified email are linked on load.
 */
export function MisEntradasPage() {
  const misEntradas = useMisEntradas();
  const { loading, error, compras, filtradas, conteo, tab, estado } = misEntradas;

  return (
    <div className="flex flex-col gap-6">
      <GritPageHeader title="Mis Entradas" subtitle="Tus entradas a eventos: estado del pago, códigos y descarga en PDF." />

      {loading ? (
        <GritEmptyState icon="hourglass_top" title="Cargando tus entradas…" />
      ) : error ? (
        <GritEmptyState
          icon="error"
          title="No se pudieron cargar tus entradas"
          description={error}
          descriptionClassName="text-grit-danger"
          action={
            <GritButton variant="secondary" size="sm" icon="refresh" onClick={misEntradas.recargar}>
              Reintentar
            </GritButton>
          }
        />
      ) : compras.length === 0 ? (
        <GritEmptyState
          icon="confirmation_number"
          title="Aún no tienes entradas."
          description="Cuando compres una entrada a un evento, la verás aquí."
          action={
            <GritButton href="/portal/eventos" icon="celebration">
              Explorar eventos
            </GritButton>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="tablist" aria-label="Entradas por fecha" className="flex gap-1 rounded-grit-md border border-grit-glass-border bg-grit-card p-1">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  onClick={() => misEntradas.setTab(item.id)}
                  className={cx(
                    'rounded-grit-sm px-4 py-2 font-grit-body text-xs font-bold transition',
                    tab === item.id ? 'bg-grit-cyan text-grit-bg' : 'text-grit-subtext hover:text-grit-text',
                  )}
                >
                  {item.label} ({conteo[item.id]})
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 font-grit-body text-xs font-semibold text-grit-subtext">
              Estado
              <select
                value={estado}
                onChange={(event) => misEntradas.setEstado(event.target.value as EventoCompraEstado | 'todos')}
                className={cx(gritSelectClass, 'w-48')}
              >
                <option value="todos">Todos</option>
                {EVENTO_COMPRA_ESTADOS.map((item) => (
                  <option key={item} value={item}>
                    {EVENTO_COMPRA_ESTADO_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filtradas.length === 0 ? (
            <p className="rounded-grit-lg border border-grit-glass-border bg-grit-card p-4 font-grit-body text-sm text-grit-subtext">
              No hay entradas {tab === 'proximas' ? 'próximas' : 'pasadas'} con este filtro.
            </p>
          ) : (
            <div role="tabpanel" className="flex flex-col gap-4">
              {filtradas.map((compra) => (
                <MiCompraCard
                  key={compra.id}
                  compra={compra}
                  puedeCancelar={misEntradas.puedeCancelar(compra)}
                  pendiente={misEntradas.pendiente[compra.id]}
                  error={misEntradas.accionError[compra.id]}
                  onCancelar={() => misEntradas.cancelar(compra)}
                  onReenviar={(file) => misEntradas.reenviarComprobante(compra, file)}
                  onLimpiarError={() => misEntradas.limpiarError(compra.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
