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
    return <p className="text-sm leading-relaxed text-slate-400">{seccion.seccion_descripcion}</p>;
  }

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
