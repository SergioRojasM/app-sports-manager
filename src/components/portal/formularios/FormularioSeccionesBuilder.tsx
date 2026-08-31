'use client';

import { useState } from 'react';
import type { FormularioSeccion, FormularioSeccionFormValues } from '@/types/portal/formularios.types';
import {
  buildFormularioRenderPlan,
  firstIdOfUnit as firstIdOf,
  firstIdOfRootItem,
  type FormularioRowEntry as RowEntry,
  type FormularioRenderUnit as RenderUnit,
} from '@/lib/portal/formulario-secciones-grouping';
import { FormularioSeccionCard } from './FormularioSeccionCard';

type FormularioSeccionesBuilderProps = {
  secciones: FormularioSeccion[];
  unsavedIds: Set<string>;
  onAddSeccion: (insertBeforeId?: string | null) => string;
  onSaveSeccion: (id: string, values: FormularioSeccionFormValues) => void;
  onDeleteSeccion: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

function InsertHandle({ beforeId, onInsert }: { beforeId: string | null; onInsert: (beforeId: string | null) => void }) {
  return (
    <div className="group/insert relative h-3">
      <button
        type="button"
        onClick={() => onInsert(beforeId)}
        aria-label="Insertar campo o sección aquí"
        className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-turquoise/50 bg-navy-deep text-turquoise opacity-0 shadow-sm transition-opacity group-hover/insert:opacity-100 hover:bg-turquoise hover:text-navy-deep"
      >
        <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
      </button>
    </div>
  );
}

export function FormularioSeccionesBuilder({
  secciones,
  unsavedIds,
  onAddSeccion,
  onSaveSeccion,
  onDeleteSeccion,
  onReorder,
}: FormularioSeccionesBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = (insertBeforeId?: string | null) => {
    const id = onAddSeccion(insertBeforeId);
    setExpandedId(id);
  };

  const handleDelete = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    onDeleteSeccion(id);
  };

  const moveSeccion = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= secciones.length) return;
    const orderedIds = secciones.map((s) => s.id);
    [orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
    onReorder(orderedIds);
  };

  const renderCard = ({ seccion, index }: RowEntry) => (
    <FormularioSeccionCard
      key={seccion.id}
      seccion={seccion}
      isNew={unsavedIds.has(seccion.id)}
      expanded={expandedId === seccion.id}
      onExpand={() => setExpandedId(seccion.id)}
      onCollapse={() => setExpandedId(null)}
      onSave={(values) => onSaveSeccion(seccion.id, values)}
      onDelete={() => handleDelete(seccion.id)}
      onMoveUp={() => moveSeccion(index, -1)}
      onMoveDown={() => moveSeccion(index, 1)}
      canMoveUp={index > 0}
      canMoveDown={index < secciones.length - 1}
    />
  );

  const renderUnit = (unit: RenderUnit) => {
    if (unit.kind === 'single') return renderCard(unit.entry);
    return (
      <div key={`${unit.a.seccion.id}-${unit.b.seccion.id}`} className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">{renderCard(unit.a)}</div>
        <div className="flex-1">{renderCard(unit.b)}</div>
      </div>
    );
  };

  const plan = buildFormularioRenderPlan(secciones);

  return (
    <div className="space-y-1">
      {secciones.length === 0 ? (
        <div className="glass rounded-lg border border-portal-border p-8 text-center">
          <span className="material-symbols-outlined mb-3 block text-4xl text-slate-500" aria-hidden="true">
            dashboard_customize
          </span>
          <p className="text-sm font-medium text-slate-300">Esta plantilla todavía no tiene secciones.</p>
          <p className="mt-1 text-xs text-slate-500">Añade tu primera sección para empezar a construir el formulario.</p>
        </div>
      ) : (
        <>
          <InsertHandle beforeId={secciones[0]?.id ?? null} onInsert={handleAdd} />
          {plan.map((item, itemIndex) => {
            const nextRootAnchor = itemIndex < plan.length - 1 ? firstIdOfRootItem(plan[itemIndex + 1]) : null;

            if (item.kind === 'card') {
              return (
                <div key={item.header.seccion.id} className="space-y-1">
                  {renderCard(item.header)}
                  <div className="ml-2 space-y-1 rounded-xl border border-portal-border/60 bg-navy-deep/30 p-3 pl-4">
                    {item.children.length === 0 ? (
                      <>
                        <p className="px-1 py-2 text-xs text-slate-500">Sin campos todavía.</p>
                        <InsertHandle beforeId={nextRootAnchor} onInsert={handleAdd} />
                      </>
                    ) : null}
                    {item.children.map((child, childIndex) => (
                      <div key={`child-wrap-${firstIdOf(child)}`}>
                        {renderUnit(child)}
                        <InsertHandle
                          beforeId={childIndex < item.children.length - 1 ? firstIdOf(item.children[childIndex + 1]) : nextRootAnchor}
                          onInsert={handleAdd}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={firstIdOf(item)}>
                {renderUnit(item)}
                <InsertHandle beforeId={nextRootAnchor} onInsert={handleAdd} />
              </div>
            );
          })}
        </>
      )}

      <button
        type="button"
        onClick={() => handleAdd(null)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-portal-border bg-navy-deep/40 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-turquoise/60 hover:text-turquoise"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
        Añadir sección de formulario
      </button>
    </div>
  );
}
