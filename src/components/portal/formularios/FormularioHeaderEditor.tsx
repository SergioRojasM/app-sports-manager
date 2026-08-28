'use client';

import { useState } from 'react';
import { useTenantLogo } from '@/hooks/portal/tenant/useTenantLogo';
import type { FormularioSeccion, FormularioSeccionTipo } from '@/types/portal/formularios.types';
import { FormularioBadgeChipInput } from './FormularioBadgeChipInput';

type FormularioHeaderEditorProps = {
  tenantId: string;
  secciones: FormularioSeccion[];
  onUpdateHeaderField?: (
    seccionTipo: FormularioSeccionTipo,
    patch: Partial<Pick<FormularioSeccion, 'seccion_descripcion' | 'campo_lista_valores'>>,
  ) => void;
  /** Read-only rendering for reuse inside FormularioPreviewModal. */
  readOnly?: boolean;
};

function findHeaderRow(secciones: FormularioSeccion[], tipo: FormularioSeccionTipo): FormularioSeccion | undefined {
  return secciones.find((s) => s.seccion_tipo === tipo);
}

function parseBadges(raw: string | null): string[] {
  return (raw ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Editable "Hero" header (US-0108) — logo/eyebrow/título/subtítulo/badges, styled per design reference P43Yo. */
export function FormularioHeaderEditor({ tenantId, secciones, onUpdateHeaderField, readOnly = false }: FormularioHeaderEditorProps) {
  const tenantLogo = useTenantLogo(tenantId);
  const [editingField, setEditingField] = useState<'sobretitulo' | 'titulo' | 'subtitulo' | null>(null);

  const sobretitulo = findHeaderRow(secciones, 'encabezado_sobretitulo');
  const titulo = findHeaderRow(secciones, 'encabezado_titulo');
  const subtitulo = findHeaderRow(secciones, 'encabezado_subtitulo');
  const badges = findHeaderRow(secciones, 'encabezado_badges');

  if (!titulo) return null;

  const badgeValues = parseBadges(badges?.campo_lista_valores ?? null);

  const editableTextClass =
    'w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-center outline-none transition hover:border-portal-border focus:border-turquoise focus:bg-navy-deep focus:ring-2 focus:ring-turquoise/35';

  return (
    <div className="flex flex-col items-center gap-3.5 border-b border-portal-border px-6 py-8 text-center">
      <div className="flex items-center gap-2">
        {tenantLogo?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenantLogo.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-turquoise text-navy-deep">
            <span className="material-symbols-outlined text-base" aria-hidden="true">bolt</span>
          </span>
        )}
        <span className="text-[13px] font-bold tracking-[0.15em] text-slate-100">
          {(tenantLogo?.nombre ?? '').toUpperCase()}
        </span>
      </div>

      {readOnly || !onUpdateHeaderField ? (
        sobretitulo?.seccion_descripcion ? (
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-turquoise">{sobretitulo.seccion_descripcion}</p>
        ) : null
      ) : editingField === 'sobretitulo' ? (
        <input
          autoFocus
          type="text"
          value={sobretitulo?.seccion_descripcion ?? ''}
          onChange={(e) => onUpdateHeaderField('encabezado_sobretitulo', { seccion_descripcion: e.target.value })}
          onBlur={() => setEditingField(null)}
          maxLength={80}
          aria-label="Sobretítulo del encabezado"
          className={`${editableTextClass} max-w-xs text-xs font-bold uppercase tracking-[0.2em] text-turquoise`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingField('sobretitulo')}
          className="rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-[0.2em] text-turquoise transition hover:bg-navy-deep/60"
        >
          {sobretitulo?.seccion_descripcion || 'Añadir sobretítulo'}
        </button>
      )}

      {readOnly || !onUpdateHeaderField ? (
        <h1 className="text-4xl font-bold leading-tight text-slate-100 sm:text-5xl">{titulo.seccion_descripcion}</h1>
      ) : editingField === 'titulo' ? (
        <input
          autoFocus
          type="text"
          value={titulo.seccion_descripcion ?? ''}
          onChange={(e) => onUpdateHeaderField('encabezado_titulo', { seccion_descripcion: e.target.value })}
          onBlur={() => setEditingField(null)}
          maxLength={150}
          aria-label="Título del encabezado"
          className={`${editableTextClass} max-w-xl text-4xl font-bold leading-tight text-slate-100 sm:text-5xl`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingField('titulo')}
          className="rounded-lg px-2 py-1 text-4xl font-bold leading-tight text-slate-100 transition hover:bg-navy-deep/60 sm:text-5xl"
        >
          {titulo.seccion_descripcion || 'Añadir título'}
        </button>
      )}

      <span
        aria-hidden="true"
        className="h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-turquoise to-transparent"
      />

      {readOnly || !onUpdateHeaderField ? (
        subtitulo?.seccion_descripcion ? <p className="text-[15px] text-slate-400">{subtitulo.seccion_descripcion}</p> : null
      ) : editingField === 'subtitulo' ? (
        <input
          autoFocus
          type="text"
          value={subtitulo?.seccion_descripcion ?? ''}
          onChange={(e) => onUpdateHeaderField('encabezado_subtitulo', { seccion_descripcion: e.target.value })}
          onBlur={() => setEditingField(null)}
          maxLength={200}
          aria-label="Subtítulo del encabezado"
          className={`${editableTextClass} max-w-lg text-[15px] text-slate-400`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingField('subtitulo')}
          className="rounded-lg px-2 py-1 text-[15px] text-slate-400 transition hover:bg-navy-deep/60"
        >
          {subtitulo?.seccion_descripcion || 'Añadir subtítulo'}
        </button>
      )}

      {readOnly || !onUpdateHeaderField ? (
        <FormularioBadgeChipInput value={badgeValues} onChange={() => {}} readOnly />
      ) : (
        <FormularioBadgeChipInput
          value={badgeValues}
          onChange={(next) => onUpdateHeaderField('encabezado_badges', { campo_lista_valores: next.length > 0 ? next.join(',') : null })}
        />
      )}
    </div>
  );
}
