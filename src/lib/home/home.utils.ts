import { EVENTOS_TIME_ZONE, formatEventoPrecio } from '@/lib/portal/eventos.utils';
import type { PrecioItem } from '@/types/portal/eventos.types';

/** Day + abbreviated month of an event in Bogotá time, e.g. { day: '23', month: 'NOV' } (US-0140). */
export function formatFechaBadge(fechaHora: string | null): { day: string; month: string } | null {
  if (!fechaHora) return null;
  const date = new Date(fechaHora);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('es-CO', {
    timeZone: EVENTOS_TIME_ZONE,
    day: '2-digit',
    month: 'short',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '').toUpperCase();
  return { day, month };
}

/** Up to two initials from an organization name, used when it has no logo. */
export function getIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/** "1 atleta" / "{n} atletas"; null when there are none (the row is hidden). */
export function formatAtletas(total: number): string | null {
  if (total <= 0) return null;
  return total === 1 ? '1 atleta' : `${total.toLocaleString('es-CO')} atletas`;
}

/** External marketing landing (separate repo, US-0139). */
export function getLandingUrl(): string {
  return (process.env.NEXT_PUBLIC_LANDING_URL || 'https://grit-arena.com').replace(/\/+$/, '');
}

/**
 * Ribbon price: "Gratis" when there is no price or the cheapest ticket is free (avoids "Desde $ 0"),
 * otherwise the shared event price format ("$ 80.000" / "Desde $ 80.000").
 */
export function formatPrecioCinta(precio: PrecioItem[]): string {
  if (precio.length === 0 || Math.min(...precio.map((item) => item.precio)) <= 0) return 'Gratis';
  return formatEventoPrecio(precio);
}
