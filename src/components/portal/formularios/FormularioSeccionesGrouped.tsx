import type { ReactNode } from 'react';
import type { FormularioSeccion } from '@/types/portal/formularios.types';
import {
  buildFormularioRenderPlan,
  type FormularioRenderUnit,
  type FormularioRowEntry,
} from '@/lib/portal/formulario-secciones-grouping';
import { FormularioSeccionContent } from './FormularioSeccionContent';

type FormularioSeccionesGroupedProps = {
  secciones: FormularioSeccion[];
  /**
   * Overrides how a 'datos' row renders — used by the live booking fill-out form to swap in
   * interactive/editable inputs while reusing the exact same card/pairing/grouping layout as the
   * read-only preview. Defaults to the disabled preview render (FormularioSeccionContent).
   */
  renderDatos?: (seccion: FormularioSeccion) => ReactNode;
};

function renderRow(seccion: FormularioSeccion, renderDatos?: (s: FormularioSeccion) => ReactNode) {
  if (seccion.seccion_tipo === 'datos' && renderDatos) {
    return renderDatos(seccion);
  }
  return <FormularioSeccionContent seccion={seccion} />;
}

function renderUnit(unit: FormularioRenderUnit, renderDatos?: (s: FormularioSeccion) => ReactNode) {
  if (unit.kind === 'single') {
    return <div key={unit.entry.seccion.id}>{renderRow(unit.entry.seccion, renderDatos)}</div>;
  }
  return (
    <div key={`${unit.a.seccion.id}-${unit.b.seccion.id}`} className="flex flex-col gap-4 sm:flex-row">
      <div className="flex-1">{renderRow(unit.a.seccion, renderDatos)}</div>
      <div className="flex-1">{renderRow(unit.b.seccion, renderDatos)}</div>
    </div>
  );
}

function cardChildKey(entry: FormularioRowEntry): string {
  return entry.seccion.id;
}

/**
 * Card-grouped rendering of a plantilla's secciones — the single shared layout (numbered 'seccion'
 * cards, 'mitad' pairing, dividers) used by both the read-only preview modal and, via `renderDatos`,
 * the interactive booking fill-out form (US-0108), so the two can never visually drift apart.
 */
export function FormularioSeccionesGrouped({ secciones, renderDatos }: FormularioSeccionesGroupedProps) {
  const plan = buildFormularioRenderPlan(secciones);

  return (
    <div className="space-y-5">
      {plan.map((item) => {
        if (item.kind !== 'card') {
          return (
            <div key={cardChildKey(item.kind === 'single' ? item.entry : item.a)}>
              {renderUnit(item, renderDatos)}
            </div>
          );
        }

        return (
          <div
            key={item.header.seccion.id}
            className="space-y-4 rounded-2xl border border-portal-border bg-navy-medium/40 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-turquoise text-sm font-bold text-navy-deep">
                {item.numero}
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-100">{item.header.seccion.seccion_descripcion}</h3>
                {item.header.seccion.seccion_subtitulo ? (
                  <p className="text-xs text-slate-400">{item.header.seccion.seccion_subtitulo}</p>
                ) : null}
              </div>
            </div>
            <div className="space-y-4">{item.children.map((child) => renderUnit(child, renderDatos))}</div>
          </div>
        );
      })}
    </div>
  );
}
