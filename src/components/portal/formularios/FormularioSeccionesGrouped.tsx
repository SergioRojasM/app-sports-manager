import type { FormularioSeccion } from '@/types/portal/formularios.types';
import {
  buildFormularioRenderPlan,
  type FormularioRenderUnit,
  type FormularioRowEntry,
} from '@/lib/portal/formulario-secciones-grouping';
import { FormularioSeccionContent } from './FormularioSeccionContent';

type FormularioSeccionesGroupedProps = {
  secciones: FormularioSeccion[];
};

function renderUnit(unit: FormularioRenderUnit) {
  if (unit.kind === 'single') {
    return <FormularioSeccionContent key={unit.entry.seccion.id} seccion={unit.entry.seccion} />;
  }
  return (
    <div key={`${unit.a.seccion.id}-${unit.b.seccion.id}`} className="flex flex-col gap-4 sm:flex-row">
      <div className="flex-1">
        <FormularioSeccionContent seccion={unit.a.seccion} />
      </div>
      <div className="flex-1">
        <FormularioSeccionContent seccion={unit.b.seccion} />
      </div>
    </div>
  );
}

function cardChildKey(entry: FormularioRowEntry): string {
  return entry.seccion.id;
}

/** Read-only, card-grouped rendering of a plantilla's secciones — shared by the preview modal and, via the live per-campo renderer, the booking fill-out form (US-0108). */
export function FormularioSeccionesGrouped({ secciones }: FormularioSeccionesGroupedProps) {
  const plan = buildFormularioRenderPlan(secciones);

  return (
    <div className="space-y-5">
      {plan.map((item) => {
        if (item.kind !== 'card') {
          return <div key={cardChildKey(item.kind === 'single' ? item.entry : item.a)}>{renderUnit(item)}</div>;
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
            <div className="space-y-4">{item.children.map((child) => renderUnit(child))}</div>
          </div>
        );
      })}
    </div>
  );
}
