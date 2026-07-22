import type { FormularioTipoCampo } from '@/types/portal/formularios.types';

type FormularioCampoPreviewInputProps = {
  campoTipo: FormularioTipoCampo;
  campoEtiqueta: string;
  campoPlaceholder: string | null;
  campoObligatorio: boolean;
  campoListaValores: string | null;
};

const baseInputClass =
  'w-full rounded-xl border border-slate-700 bg-navy-deep/60 px-4 py-3 text-sm text-slate-400 outline-none';

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

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-200">
        {campoEtiqueta}
        {campoObligatorio ? <span className="text-rose-400"> *</span> : null}
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
