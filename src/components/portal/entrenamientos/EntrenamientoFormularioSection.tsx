'use client';

import Link from 'next/link';
import type {
  TrainingFieldErrors,
  TrainingFormularioFormState,
  TrainingFormularioTipo,
  TrainingWizardValues,
} from '@/types/portal/entrenamientos.types';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';
import type { UserRole } from '@/types/portal.types';

type Props = {
  tenantId: string;
  role: UserRole | null;
  values: TrainingWizardValues;
  fieldErrors: TrainingFieldErrors;
  formularioForm: TrainingFormularioFormState;
  plantillas: FormularioPlantillaListItem[];
  onChangeFormularioExterno: (value: string) => void;
  onChangeTipo: (tipo: TrainingFormularioTipo) => void;
  onChangePlantillaId: (id: string) => void;
  onChangeObligatorio: (value: boolean) => void;
};

function InputError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
      {message}
    </p>
  );
}

export function EntrenamientoFormularioSection({
  tenantId,
  role,
  values,
  fieldErrors,
  formularioForm,
  plantillas,
  onChangeFormularioExterno,
  onChangeTipo,
  onChangePlantillaId,
  onChangeObligatorio,
}: Props) {
  const enabled = formularioForm.tipo !== 'ninguno';

  return (
    <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-100">Formulario</h3>
        <label className="inline-flex items-center gap-2 text-xs text-slate-200">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChangeTipo(event.target.checked ? 'externo' : 'ninguno')}
            className="rounded border-slate-600 bg-navy-deep accent-turquoise"
          />
          ¿Agregar formulario para poder reservar?
        </label>
      </div>

      {!enabled ? (
        <p className="text-xs text-slate-400">No se solicitará ningún formulario para reservar en este entrenamiento.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-300">¿Es externo? (ej. Google Forms)</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="formulario_tipo"
                  value="externo"
                  checked={formularioForm.tipo === 'externo'}
                  onChange={() => onChangeTipo('externo')}
                  className="accent-turquoise"
                />
                Sí, es externo
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="formulario_tipo"
                  value="interno"
                  checked={formularioForm.tipo === 'interno'}
                  onChange={() => onChangeTipo('interno')}
                  className="accent-turquoise"
                />
                No, usar una plantilla
              </label>
            </div>
          </div>

          {formularioForm.tipo === 'externo' ? (
            <div>
              <label htmlFor="formulario_externo" className="mb-1 block text-xs text-slate-300">URL del formulario</label>
              <input
                id="formulario_externo"
                type="url"
                maxLength={500}
                value={values.formulario_externo}
                onChange={(event) => onChangeFormularioExterno(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                placeholder="https://"
              />
              <InputError message={fieldErrors.formulario_externo} />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-slate-300">Plantilla de formulario</label>
              <select
                value={formularioForm.formulario_id}
                onChange={(event) => onChangePlantillaId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Selecciona una plantilla</option>
                {plantillas.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre}
                  </option>
                ))}
              </select>
              <InputError message={fieldErrors.formulario_id} />
              {role === 'administrador' ? (
                <Link
                  href={`/portal/orgs/${tenantId}/gestion-formularios`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-turquoise hover:underline"
                >
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: '14px' }} aria-hidden="true">
                    add
                  </span>
                  Crear nueva plantilla
                </Link>
              ) : null}
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={formularioForm.obligatorio}
              onChange={(event) => onChangeObligatorio(event.target.checked)}
              className="rounded border-slate-600 bg-navy-deep accent-turquoise"
            />
            Formulario obligatorio para poder reservar
          </label>
        </div>
      )}
    </section>
  );
}
