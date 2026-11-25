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
    <p className="mt-1 text-xs font-medium text-grit-danger" role="alert">
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
    <section className="space-y-3 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-grit-title text-sm font-semibold text-grit-text">Formulario</h3>
        <label className="inline-flex items-center gap-2 text-xs text-grit-text">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => onChangeTipo(event.target.checked ? 'externo' : 'ninguno')}
            className="rounded border-grit-glass-border bg-grit-bg accent-grit-cyan"
          />
          ¿Agregar formulario para poder reservar?
        </label>
      </div>

      {!enabled ? (
        <p className="text-xs text-grit-subtext">No se solicitará ningún formulario para reservar en este entrenamiento.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-grit-subtext">¿Es externo? (ej. Google Forms)</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-grit-text">
                <input
                  type="radio"
                  name="formulario_tipo"
                  value="externo"
                  checked={formularioForm.tipo === 'externo'}
                  onChange={() => onChangeTipo('externo')}
                  className="accent-grit-cyan"
                />
                Sí, es externo
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-grit-text">
                <input
                  type="radio"
                  name="formulario_tipo"
                  value="interno"
                  checked={formularioForm.tipo === 'interno'}
                  onChange={() => onChangeTipo('interno')}
                  className="accent-grit-cyan"
                />
                No, usar una plantilla
              </label>
            </div>
          </div>

          {formularioForm.tipo === 'externo' ? (
            <div>
              <label htmlFor="formulario_externo" className="mb-1 block text-xs text-grit-subtext">URL del formulario</label>
              <input
                id="formulario_externo"
                type="url"
                maxLength={500}
                value={values.formulario_externo}
                onChange={(event) => onChangeFormularioExterno(event.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                placeholder="https://"
              />
              <InputError message={fieldErrors.formulario_externo} />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Plantilla de formulario</label>
              <select
                value={formularioForm.formulario_id}
                onChange={(event) => onChangePlantillaId(event.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
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
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-grit-cyan hover:underline"
                >
                  <span className="material-symbols-outlined leading-none" style={{ fontSize: '14px' }} aria-hidden="true">
                    add
                  </span>
                  Crear nueva plantilla
                </Link>
              ) : null}
            </div>
          )}

          <label className="inline-flex items-center gap-2 text-sm text-grit-text">
            <input
              type="checkbox"
              checked={formularioForm.obligatorio}
              onChange={(event) => onChangeObligatorio(event.target.checked)}
              className="rounded border-grit-glass-border bg-grit-bg accent-grit-cyan"
            />
            Formulario obligatorio para poder reservar
          </label>
        </div>
      )}
    </section>
  );
}
