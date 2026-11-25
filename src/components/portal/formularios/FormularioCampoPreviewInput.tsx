import type { FormularioTipoCampo } from '@/types/portal/formularios.types';

type FormularioCampoPreviewInputProps = {
  campoTipo: FormularioTipoCampo;
  campoEtiqueta: string;
  campoPlaceholder: string | null;
  campoObligatorio: boolean;
  campoListaValores: string | null;
};

// Explicit 8px radius (not the named lg/xl radius utilities — this project overrides those to
// 2rem/3rem for the landing page's pill-shaped buttons) to match the P43Yo "Field Box" reference.
const baseInputClass =
  'w-full rounded-[8px] border border-grit-glass-border bg-grit-bg/60 px-4 py-3 text-sm text-grit-subtext outline-none';

/** Disabled, read-only preview of the real input control a "Datos" section will render. */
export function FormularioCampoPreviewInput({
  campoTipo,
  campoEtiqueta,
  campoPlaceholder,
  campoObligatorio,
  campoListaValores,
}: FormularioCampoPreviewInputProps) {
  const opciones = (campoListaValores ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

  if (campoTipo === 'checkbox') {
    return (
      <div className="flex items-center gap-2">
        <input disabled type="checkbox" className="rounded border-grit-glass-border bg-grit-bg/60" />
        <label className="text-sm font-medium text-grit-text">
          {campoEtiqueta}
          {campoObligatorio ? <span className="text-grit-danger"> *</span> : null}
        </label>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-grit-text">
        {campoEtiqueta}
        {campoObligatorio ? <span className="text-grit-danger"> *</span> : null}
      </label>
      {campoTipo === 'texto_largo' ? (
        <textarea disabled rows={3} placeholder={campoPlaceholder ?? ''} className={baseInputClass} />
      ) : campoTipo === 'lista' ? (
        <select disabled defaultValue="" className={baseInputClass}>
          <option value="" disabled>
            Selecciona una opción
          </option>
          {opciones.map((opcion) => (
            <option key={opcion}>{opcion}</option>
          ))}
        </select>
      ) : campoTipo === 'seleccion' ? (
        <div className="flex gap-3">
          {opciones.length === 0 ? (
            <span className="text-xs text-grit-muted">Agrega valores permitidos para previsualizar las opciones.</span>
          ) : (
            opciones.map((opcion) => (
              <span
                key={opcion}
                className="flex-1 rounded-[8px] border border-grit-glass-border bg-grit-bg/60 px-4 py-4 text-center text-base font-bold text-grit-subtext"
              >
                {opcion}
              </span>
            ))
          )}
        </div>
      ) : campoTipo === 'imagen' ? (
        <input disabled type="file" accept="image/*" className={baseInputClass} />
      ) : (
        <input
          disabled
          type={campoTipo === 'fecha' ? 'date' : campoTipo === 'numerico' ? 'number' : 'text'}
          placeholder={campoPlaceholder ?? ''}
          className={baseInputClass}
        />
      )}
    </div>
  );
}
