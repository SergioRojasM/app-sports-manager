import { MultilineText } from '@/components/ui';
import type { FormularioSeccion } from '@/types/portal/formularios.types';
import { FormularioCampoPreviewInput } from './FormularioCampoPreviewInput';

type FormularioSeccionContentProps = {
  seccion: FormularioSeccion;
};

/** Renders a section per its `seccion_tipo`, shared by the section card's collapsed view and the preview modal. */
export function FormularioSeccionContent({ seccion }: FormularioSeccionContentProps) {
  if (seccion.seccion_tipo === 'titulo') {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-slate-100">{seccion.seccion_descripcion}</h2>
        <hr className="mt-3 border-portal-border" />
      </div>
    );
  }

  if (seccion.seccion_tipo === 'subtitulo') {
    return <h3 className="text-lg font-semibold text-slate-200">{seccion.seccion_descripcion}</h3>;
  }

  if (seccion.seccion_tipo === 'texto') {
    return <MultilineText className="text-sm leading-relaxed text-slate-400">{seccion.seccion_descripcion}</MultilineText>;
  }

  if (seccion.seccion_tipo === 'separador') {
    return <hr className="border-portal-border" />;
  }

  if (seccion.seccion_tipo === 'datos') {
    return (
      <FormularioCampoPreviewInput
        campoTipo={seccion.campo_tipo ?? 'texto_corto'}
        campoEtiqueta={seccion.campo_etiqueta ?? ''}
        campoPlaceholder={seccion.campo_placeholder}
        campoObligatorio={seccion.campo_obligatorio}
        campoListaValores={seccion.campo_lista_valores}
      />
    );
  }

  if (seccion.seccion_tipo === 'seccion') {
    return (
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-turquoise text-lg" aria-hidden="true">dashboard_customize</span>
        <div>
          <h3 className="text-base font-bold text-slate-100">{seccion.seccion_descripcion || 'Sección sin título'}</h3>
          {seccion.seccion_subtitulo ? <p className="text-xs text-slate-400">{seccion.seccion_subtitulo}</p> : null}
        </div>
      </div>
    );
  }

  // Every 'encabezado_*' row is rendered exclusively by FormularioHeaderEditor and never reaches
  // this generic per-row renderer in normal operation.
  return null;
}
