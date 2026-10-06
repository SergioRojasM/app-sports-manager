'use client';

import { useRouter } from 'next/navigation';
import { GritButton, GritCard, GritEmptyState, GritPageHeader } from '@/components/ui';
import { useNotificaciones } from '@/hooks/portal/notificaciones/useNotificaciones';
import type { Notificacion } from '@/types/portal/notificaciones.types';
import { NotificacionItem } from './NotificacionItem';
import { esUrlInterna } from './NotificacionesBell';

const PAGE_SIZE = 20;

/** Full history of the user's in-app notifications, newest first (US-0125). */
export function NotificacionesPage() {
  const router = useRouter();
  const notificaciones = useNotificaciones({ limit: PAGE_SIZE });
  const { items, loading, error, noLeidas, page, totalPages } = notificaciones;

  const handleSelect = (notificacion: Notificacion) => {
    void notificaciones.marcarLeida(notificacion.id);
    if (esUrlInterna(notificacion.url)) router.push(notificacion.url);
  };

  return (
    <div className="flex flex-col gap-6">
      <GritPageHeader
        title="Notificaciones"
        subtitle="Avisos sobre tus compras, entradas y la actividad de tus organizaciones."
        actions={
          <GritButton
            variant="secondary"
            size="sm"
            icon="done_all"
            disabled={noLeidas === 0}
            onClick={() => void notificaciones.marcarTodasLeidas()}
          >
            Marcar todas como leídas
          </GritButton>
        }
      />

      {loading ? (
        <GritEmptyState icon="hourglass_top" title="Cargando notificaciones…" />
      ) : error ? (
        <div role="alert">
          <GritEmptyState
            icon="error"
            title="No se pudieron cargar tus notificaciones"
            description={error}
            descriptionClassName="text-grit-danger"
            action={
              <GritButton variant="secondary" size="sm" icon="refresh" onClick={notificaciones.recargar}>
                Reintentar
              </GritButton>
            }
          />
        </div>
      ) : items.length === 0 ? (
        <GritEmptyState
          icon="notifications"
          title="No tienes notificaciones"
          description="Aquí verás los avisos sobre tus compras y entradas."
        />
      ) : (
        <>
          <GritCard variant="card" padding="none" className="overflow-hidden">
            <ul className="divide-y divide-grit-glass-border">
              {items.map((item) => (
                <li key={item.id}>
                  <NotificacionItem notificacion={item} onSelect={handleSelect} />
                </li>
              ))}
            </ul>
          </GritCard>

          {totalPages > 1 && (
            <nav aria-label="Paginación de notificaciones" className="flex items-center justify-center gap-3">
              <GritButton
                variant="secondary"
                size="sm"
                icon="chevron_left"
                disabled={page <= 1}
                onClick={() => notificaciones.setPage(page - 1)}
              >
                Anterior
              </GritButton>
              <span className="font-grit-body text-xs text-grit-subtext">
                Página {page} de {totalPages}
              </span>
              <GritButton
                variant="secondary"
                size="sm"
                icon="chevron_right"
                iconPosition="end"
                disabled={page >= totalPages}
                onClick={() => notificaciones.setPage(page + 1)}
              >
                Siguiente
              </GritButton>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
