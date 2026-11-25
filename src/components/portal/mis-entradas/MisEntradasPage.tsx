'use client';

import { GritButton, GritEmptyState, GritPageHeader, GritSegmented, gritPillSelectClass } from '@/components/ui';
import { useEventosSugeridos } from '@/hooks/portal/mis-entradas/useEventosSugeridos';
import { useMisEntradas } from '@/hooks/portal/mis-entradas/useMisEntradas';
import {
  EVENTO_COMPRA_ESTADOS,
  EVENTO_COMPRA_ESTADO_LABELS,
  type EventoCompraEstado,
  type MisEntradasTab,
} from '@/types/portal/eventos-compras.types';
import { EventosSugeridos } from './EventosSugeridos';
import { MiCompraCard } from './MiCompraCard';

/**
 * "Mis entradas" (US-0121, grit-arena-v3 frame `v1lcBA`): the user's event purchases across
 * organizations as ticket cards with a QR stub, plus upcoming suggestions. Guest purchases made
 * with the account's verified email are linked on load.
 */
export function MisEntradasPage() {
  const misEntradas = useMisEntradas();
  const { loading, error, compras, filtradas, conteo, tab, estado } = misEntradas;
  const sugeridos = useEventosSugeridos(compras);
  const hasCompras = !loading && !error && compras.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <GritPageHeader
        title="Mis"
        titleAccent="entradas."
        italic
        actions={
          hasCompras ? (
            <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:w-auto">
              <GritSegmented<MisEntradasTab>
                ariaLabel="Entradas por fecha"
                variant="solid"
                options={[
                  { value: 'proximas', label: 'Próximas', count: conteo.proximas },
                  { value: 'pasadas', label: 'Pasadas', count: conteo.pasadas },
                ]}
                value={tab}
                onChange={misEntradas.setTab}
              />
              <select
                aria-label="Filtrar por estado"
                value={estado}
                onChange={(event) => misEntradas.setEstado(event.target.value as EventoCompraEstado | 'todos')}
                className={gritPillSelectClass}
              >
                <option value="todos">Estado: Todos</option>
                {EVENTO_COMPRA_ESTADOS.map((item) => (
                  <option key={item} value={item}>
                    Estado: {EVENTO_COMPRA_ESTADO_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
          ) : undefined
        }
      />

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
      ) : filtradas.length === 0 ? (
        <GritEmptyState icon="filter_alt_off" title={`No hay entradas ${tab === 'proximas' ? 'próximas' : 'pasadas'} con este filtro.`} />
      ) : (
        <div className="flex flex-col gap-4">
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

      {!loading ? <EventosSugeridos eventos={sugeridos} /> : null}
    </div>
  );
}
