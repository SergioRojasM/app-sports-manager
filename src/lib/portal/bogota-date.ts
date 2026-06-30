export function bogotaDayStartIso(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000-05:00`;
}

export function bogotaDayEndIso(dateOnly: string): string {
  return `${dateOnly}T23:59:59.999-05:00`;
}
