export function bogotaDayStartIso(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000-05:00`;
}

export function bogotaDayEndIso(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999-05:00`;
}

export function formatBogotaDateTime(fechaStr: string): string {
  const date = new Date(fechaStr);
  const day = date.toLocaleDateString('es-CO', { weekday: 'short', timeZone: 'America/Bogota' });
  const dayMonth = date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Bogota',
  });
  const time = date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota',
  });
  return `${day}, ${dayMonth} · ${time}`;
}
