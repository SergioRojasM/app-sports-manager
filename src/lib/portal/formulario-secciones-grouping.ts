import type { FormularioSeccion } from '@/types/portal/formularios.types';

export type FormularioRowEntry = { seccion: FormularioSeccion; index: number };

export type FormularioRenderUnit =
  | { kind: 'single'; entry: FormularioRowEntry }
  | { kind: 'pair'; a: FormularioRowEntry; b: FormularioRowEntry };

export type FormularioRootItem =
  | { kind: 'card'; header: FormularioRowEntry; numero: number; children: FormularioRenderUnit[] }
  | FormularioRenderUnit;

function isMitadDatos(seccion: FormularioSeccion): boolean {
  return seccion.seccion_tipo === 'datos' && seccion.columna_ancho === 'mitad';
}

/** Pairs adjacent 'mitad'-width "Datos" rows two by two; a lone trailing one renders alone. */
function pairColumns(buffer: FormularioRowEntry[]): FormularioRenderUnit[] {
  const units: FormularioRenderUnit[] = [];
  let i = 0;
  while (i < buffer.length) {
    const cur = buffer[i];
    const next = buffer[i + 1];
    if (isMitadDatos(cur.seccion) && next && isMitadDatos(next.seccion)) {
      units.push({ kind: 'pair', a: cur, b: next });
      i += 2;
    } else {
      units.push({ kind: 'single', entry: cur });
      i += 1;
    }
  }
  return units;
}

/**
 * Groups a flat, order-derived section list into root-level rows and 'seccion' cards (US-0108).
 * A 'seccion' row visually owns every row that follows it until the next 'seccion' row — this is
 * purely positional (no parent-id column). Shared by the admin builder, the read-only preview,
 * and the live booking fill-out form so all three render identically.
 */
export function buildFormularioRenderPlan(secciones: FormularioSeccion[]): FormularioRootItem[] {
  const entries: FormularioRowEntry[] = secciones.map((seccion, index) => ({ seccion, index }));
  const plan: FormularioRootItem[] = [];
  let rootBuffer: FormularioRowEntry[] = [];
  let pendingCard: { header: FormularioRowEntry; numero: number; buffer: FormularioRowEntry[] } | null = null;
  let cardCount = 0;

  const closeCard = () => {
    if (!pendingCard) return;
    plan.push({ kind: 'card', header: pendingCard.header, numero: pendingCard.numero, children: pairColumns(pendingCard.buffer) });
    pendingCard = null;
  };
  const flushRoot = () => {
    if (rootBuffer.length === 0) return;
    plan.push(...pairColumns(rootBuffer));
    rootBuffer = [];
  };

  for (const entry of entries) {
    if (entry.seccion.seccion_tipo === 'seccion') {
      closeCard();
      flushRoot();
      cardCount += 1;
      pendingCard = { header: entry, numero: cardCount, buffer: [] };
    } else if (pendingCard) {
      pendingCard.buffer.push(entry);
    } else {
      rootBuffer.push(entry);
    }
  }
  closeCard();
  flushRoot();

  return plan;
}

/** First row id belonging to a render unit — used as the section builder's "insert before" anchor. */
export function firstIdOfUnit(unit: FormularioRenderUnit): string {
  return unit.kind === 'single' ? unit.entry.seccion.id : unit.a.seccion.id;
}

/** First row id belonging to a top-level plan item (a card's own header row, for cards). */
export function firstIdOfRootItem(item: FormularioRootItem): string {
  return item.kind === 'card' ? item.header.seccion.id : firstIdOfUnit(item);
}
