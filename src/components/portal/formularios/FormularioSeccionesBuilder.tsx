'use client';

import { useState } from 'react';
import type { FormularioSeccion, FormularioSeccionFormValues } from '@/types/portal/formularios.types';
import { FormularioSeccionCard } from './FormularioSeccionCard';

type FormularioSeccionesBuilderProps = {
  secciones: FormularioSeccion[];
  unsavedIds: Set<string>;
  seccionError: string | null;
  onAddSeccion: () => string;
  onSaveSeccion: (id: string, values: FormularioSeccionFormValues) => Promise<boolean>;
  onDeleteSeccion: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
};

export function FormularioSeccionesBuilder({
  secciones,
  unsavedIds,
  seccionError,
  onAddSeccion,
  onSaveSeccion,
  onDeleteSeccion,
  onReorder,
}: FormularioSeccionesBuilderProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = () => {
    const id = onAddSeccion();
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

  return (
    <div className="space-y-4">
      {secciones.length === 0 ? (
        <div className="glass rounded-lg border border-portal-border p-8 text-center">
          <span className="material-symbols-outlined mb-3 block text-4xl text-slate-500" aria-hidden="true">
            dashboard_customize
          </span>
          <p className="text-sm font-medium text-slate-300">Esta plantilla todavía no tiene secciones.</p>
          <p className="mt-1 text-xs text-slate-500">Añade tu primera sección para empezar a construir el formulario.</p>
        </div>
      ) : (
        secciones.map((seccion, index) => (
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
            submitError={expandedId === seccion.id ? seccionError : null}
          />
        ))
      )}

      <button
        type="button"
        onClick={handleAdd}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-portal-border bg-navy-deep/40 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-turquoise/60 hover:text-turquoise"
      >
        <span className="material-symbols-outlined text-base" aria-hidden="true">add</span>
        Añadir sección de formulario
      </button>
    </div>
  );
}
