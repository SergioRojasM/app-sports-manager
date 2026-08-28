'use client';

import { useState } from 'react';
import {
  FORMULARIO_SECCION_TIPOS,
  FORMULARIO_SECCION_TIPO_LABELS,
  FORMULARIO_TIPOS_CAMPO,
  FORMULARIO_TIPO_CAMPO_LABELS,
  FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES,
  type FormularioSeccion,
  type FormularioSeccionFormValues,
} from '@/types/portal/formularios.types';
import { useFormularioSeccionForm } from '@/hooks/portal/formularios/useFormularioSeccionForm';
import { FormularioSeccionContent } from './FormularioSeccionContent';
import { FormularioTipoCampoBadge } from './FormularioTipoCampoBadge';

type FormularioSeccionCardProps = {
  seccion: FormularioSeccion;
  isNew: boolean;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onSave: (values: FormularioSeccionFormValues) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
};

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35';

export function FormularioSeccionCard({
  seccion,
  isNew,
  expanded,
  onExpand,
  onCollapse,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: FormularioSeccionCardProps) {
  const { values, setField, fieldError, handleSubmit } = useFormularioSeccionForm({
    initialValues: seccion,
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDone = () => {
    const ok = handleSubmit((vals) => onSave(vals));
    if (ok) onCollapse();
  };

  const handleCancel = () => {
    if (isNew) {
      onDelete();
    } else {
      onCollapse();
    }
  };

  if (!expanded) {
    return (
      <div className="group relative px-1 py-2">
        <FormularioSeccionContent seccion={seccion} />

        <div className="absolute right-1 top-2 flex items-center gap-1 rounded-lg bg-navy-deep/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label="Mover sección hacia arriba"
            className="rounded p-1.5 text-slate-400 transition hover:text-turquoise disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_upward</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label="Mover sección hacia abajo"
            className="rounded p-1.5 text-slate-400 transition hover:text-turquoise disabled:cursor-not-allowed disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">arrow_downward</span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            aria-label="Editar sección"
            className="rounded p-1.5 text-slate-400 transition hover:text-turquoise"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
          </button>
          {confirmingDelete ? (
            <>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-portal-border px-2 py-1 text-xs font-semibold text-slate-300"
              >
                No
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label="Eliminar sección"
              className="rounded p-1.5 text-slate-400 transition hover:text-rose-300"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const isDatos = values.seccion_tipo === 'datos';
  const isSeparador = values.seccion_tipo === 'separador';
  const isSeccion = values.seccion_tipo === 'seccion';
  const usesListaValores = FORMULARIO_TIPOS_CAMPO_CON_LISTA_VALORES.includes(values.campo_tipo);

  return (
    <div className="rounded-xl border border-turquoise/50 bg-navy-medium/60 p-5 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`seccion-tipo-${seccion.id}`}>
            Tipo de sección
          </label>
          <select
            id={`seccion-tipo-${seccion.id}`}
            value={values.seccion_tipo}
            onChange={(e) => setField('seccion_tipo', e.target.value as FormularioSeccionFormValues['seccion_tipo'])}
            className={inputClass}
          >
            {FORMULARIO_SECCION_TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {FORMULARIO_SECCION_TIPO_LABELS[tipo]}
              </option>
            ))}
          </select>
        </div>

        {isSeparador ? (
          <p className="text-sm text-slate-400">Un separador no tiene contenido — solo dibuja una línea divisoria.</p>
        ) : isDatos ? (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`campo-etiqueta-${seccion.id}`}>
                Etiqueta <span className="text-rose-400">*</span>
              </label>
              <input
                id={`campo-etiqueta-${seccion.id}`}
                type="text"
                value={values.campo_etiqueta}
                onChange={(e) => setField('campo_etiqueta', e.target.value)}
                maxLength={150}
                placeholder="Ej: Peso (kg)"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`campo-tipo-${seccion.id}`}>
                Tipo de dato <span className="text-rose-400">*</span>
              </label>
              <select
                id={`campo-tipo-${seccion.id}`}
                value={values.campo_tipo}
                onChange={(e) => setField('campo_tipo', e.target.value as FormularioSeccionFormValues['campo_tipo'])}
                className={inputClass}
              >
                {FORMULARIO_TIPOS_CAMPO.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {FORMULARIO_TIPO_CAMPO_LABELS[tipo]}
                  </option>
                ))}
              </select>
            </div>

            {usesListaValores ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`campo-lista-valores-${seccion.id}`}>
                  Valores permitidos <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id={`campo-lista-valores-${seccion.id}`}
                  rows={3}
                  value={values.campo_lista_valores}
                  onChange={(e) => setField('campo_lista_valores', e.target.value)}
                  placeholder="Ej: Camiseta S, Camiseta M, Camiseta L"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-slate-500">Valores separados por coma.</p>
              </div>
            ) : null}

            {values.campo_tipo !== 'checkbox' ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`campo-placeholder-${seccion.id}`}>
                  Placeholder <span className="normal-case font-normal text-slate-500">(opcional)</span>
                </label>
                <input
                  id={`campo-placeholder-${seccion.id}`}
                  type="text"
                  value={values.campo_placeholder}
                  onChange={(e) => setField('campo_placeholder', e.target.value)}
                  maxLength={200}
                  className={inputClass}
                />
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`campo-columna-ancho-${seccion.id}`}>
                Ancho de columna
              </label>
              <select
                id={`campo-columna-ancho-${seccion.id}`}
                value={values.columna_ancho}
                onChange={(e) => setField('columna_ancho', e.target.value as FormularioSeccionFormValues['columna_ancho'])}
                className={inputClass}
              >
                <option value="completo">Completo</option>
                <option value="mitad">Mitad (dos columnas)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id={`campo-obligatorio-${seccion.id}`}
                type="checkbox"
                checked={values.campo_obligatorio}
                onChange={(e) => setField('campo_obligatorio', e.target.checked)}
                className="rounded border-slate-600 bg-navy-deep"
              />
              <label htmlFor={`campo-obligatorio-${seccion.id}`} className="text-sm text-slate-200">
                Campo obligatorio
              </label>
              {values.campo_tipo ? (
                <span className="ml-auto">
                  <FormularioTipoCampoBadge tipo={values.campo_tipo} />
                </span>
              ) : null}
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`seccion-descripcion-${seccion.id}`}>
                {isSeccion ? 'Título de la sección' : 'Descripción'} <span className="text-rose-400">*</span>
              </label>
              <textarea
                id={`seccion-descripcion-${seccion.id}`}
                rows={isSeccion || values.seccion_tipo === 'titulo' ? 2 : 3}
                value={values.seccion_descripcion}
                onChange={(e) => setField('seccion_descripcion', e.target.value)}
                placeholder={isSeccion ? 'Ej: Tus datos' : 'Escribe el contenido de esta sección'}
                className={inputClass}
              />
            </div>

            {isSeccion ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400" htmlFor={`seccion-subtitulo-${seccion.id}`}>
                  Subtítulo de la sección <span className="normal-case font-normal text-slate-500">(opcional)</span>
                </label>
                <input
                  id={`seccion-subtitulo-${seccion.id}`}
                  type="text"
                  value={values.seccion_subtitulo}
                  onChange={(e) => setField('seccion_subtitulo', e.target.value)}
                  maxLength={200}
                  placeholder="Ej: Información básica del atleta"
                  className={inputClass}
                />
              </div>
            ) : null}
          </>
        )}

        {fieldError ? (
          <div className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
            {fieldError}
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-end gap-3 border-t border-portal-border pt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-navy-deep hover:text-slate-100"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDone}
          className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition-all duration-200 hover:bg-turquoise/85 hover:shadow-lg hover:shadow-turquoise/25"
        >
          Listo
          <span className="material-symbols-outlined text-base" aria-hidden="true">check</span>
        </button>
      </div>
    </div>
  );
}
