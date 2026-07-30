'use client';

import { useEffect } from 'react';
import type {
  CategoriasFormState,
  SelectOption,
  TrainingFieldErrors,
  TrainingFormularioFormState,
  TrainingFormularioTipo,
  TrainingRuleErrors,
  TrainingWizardValues,
} from '@/types/portal/entrenamientos.types';
import type { NivelDisciplina } from '@/types/portal/nivel-disciplina.types';
import type { FormularioPlantillaListItem } from '@/types/portal/formularios.types';
import type { UserRole } from '@/types/portal.types';
import { EntrenamientoWizard } from './EntrenamientoWizard';
import { EntrenamientoCategoriasSection } from './EntrenamientoCategoriasSection';
import { EntrenamientoRestriccionesSection } from './EntrenamientoRestriccionesSection';
import { EntrenamientoFormularioSection } from './EntrenamientoFormularioSection';
import { GuardarPlantillaModal } from './GuardarPlantillaModal';
import { PlantillasListModal } from './PlantillasListModal';
import type { EntrenamientoRestriccionInput } from '@/types/portal/entrenamiento-restricciones.types';
import type { EntrenamientoPlantilla, EntrenamientoPlantillaContenido } from '@/types/portal/entrenamiento-plantillas.types';

type EntrenamientoFormModalProps = {
  open: boolean;
  mode: 'create' | 'edit';
  isEditingSingleInstance: boolean;
  isUniqueTypeLocked: boolean;
  isSubmitting: boolean;
  values: TrainingWizardValues;
  fieldErrors: TrainingFieldErrors;
  ruleErrors: TrainingRuleErrors;
  submitError: string | null;
  disciplinas: SelectOption[];
  escenarios: SelectOption[];
  entrenadores: SelectOption[];
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof TrainingWizardValues, value: string) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onChangeRuleField: (index: number, field: 'tipo_bloque' | 'hora_inicio' | 'hora_fin' | 'horas_especificas', value: string | string[]) => void;
  // Categories
  disciplinaHasNiveles: boolean;
  categoriasForm: CategoriasFormState;
  activeNiveles: NivelDisciplina[];
  totalAsignado: number;
  cuposSinCategoria: number;
  sumExceedsMax: boolean;
  categoriasError: string | null;
  onToggleCategorias: (enabled: boolean) => void;
  onUpdateCategoriasCupos: (nivelId: string, cupos: number) => void;
  // Restrictions
  servicios: SelectOption[];
  restricciones: EntrenamientoRestriccionInput[];
  reservaAntelacionHoras: number | null;
  cancelacionAntelacionHoras: number | null;
  onSetReservaAntelacion: (value: number | null) => void;
  onSetCancelacionAntelacion: (value: number | null) => void;
  onAddRestriccion: () => void;
  onDuplicateRestriccion: (index: number) => void;
  onRemoveRestriccion: (index: number) => void;
  onUpdateRestriccion: (index: number, patch: Partial<EntrenamientoRestriccionInput>) => void;
  // Formulario
  tenantId: string;
  role: UserRole | null;
  formularioForm: TrainingFormularioFormState;
  formulariosPlantillas: FormularioPlantillaListItem[];
  onChangeFormularioTipo: (tipo: TrainingFormularioTipo) => void;
  onChangeFormularioPlantillaId: (id: string) => void;
  onChangeFormularioObligatorio: (value: boolean) => void;
  // Templates
  plantillas: EntrenamientoPlantilla[];
  plantillasLoading: boolean;
  plantillasError: string | null;
  isPlantillasListModalOpen: boolean;
  onOpenPlantillasListModal: () => void;
  onClosePlantillasListModal: () => void;
  isGuardarPlantillaModalOpen: boolean;
  onOpenGuardarPlantillaModal: () => void;
  onCloseGuardarPlantillaModal: () => void;
  isSavingPlantilla: boolean;
  guardarPlantillaError: string | null;
  onGuardarPlantilla: (nombre: string, descripcion: string | null) => Promise<boolean>;
  onAplicarPlantilla: (contenido: EntrenamientoPlantillaContenido) => void;
  onEliminarPlantilla: (id: string) => Promise<boolean>;
};

export function EntrenamientoFormModal({
  open,
  mode,
  isEditingSingleInstance,
  isUniqueTypeLocked,
  isSubmitting,
  values,
  fieldErrors,
  ruleErrors,
  submitError,
  disciplinas,
  escenarios,
  entrenadores,
  onClose,
  onSubmit,
  onChangeField,
  onAddRule,
  onRemoveRule,
  onChangeRuleField,
  disciplinaHasNiveles,
  categoriasForm,
  activeNiveles,
  totalAsignado,
  cuposSinCategoria,
  sumExceedsMax,
  categoriasError,
  onToggleCategorias,
  onUpdateCategoriasCupos,
  servicios,
  restricciones,
  reservaAntelacionHoras,
  cancelacionAntelacionHoras,
  onSetReservaAntelacion,
  onSetCancelacionAntelacion,
  onAddRestriccion,
  onDuplicateRestriccion,
  onRemoveRestriccion,
  onUpdateRestriccion,
  tenantId,
  role,
  formularioForm,
  formulariosPlantillas,
  onChangeFormularioTipo,
  onChangeFormularioPlantillaId,
  onChangeFormularioObligatorio,
  plantillas,
  plantillasLoading,
  plantillasError,
  isPlantillasListModalOpen,
  onOpenPlantillasListModal,
  onClosePlantillasListModal,
  isGuardarPlantillaModalOpen,
  onOpenGuardarPlantillaModal,
  onCloseGuardarPlantillaModal,
  isSavingPlantilla,
  guardarPlantillaError,
  onGuardarPlantilla,
  onAplicarPlantilla,
  onEliminarPlantilla,
}: EntrenamientoFormModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de entrenamiento"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear entrenamiento' : 'Editar entrenamiento'}
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-100">
                {mode === 'create' ? 'Crear entrenamiento' : 'Editar entrenamiento'}
              </h2>
              {mode === 'create' ? (
                <button
                  type="button"
                  aria-label="Ver plantillas guardadas"
                  onClick={onOpenPlantillasListModal}
                  className="inline-flex items-center gap-1 rounded-lg border border-portal-border bg-navy-deep/70 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-turquoise/70"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">
                    bookmark
                  </span>
                  Ver plantillas
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {isEditingSingleInstance
                ? 'Editando solo esta instancia con datos propios del entrenamiento.'
                : 'Configura serie, recurrencia y excepciones para los entrenamientos.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EntrenamientoWizard
            values={values}
            fieldErrors={fieldErrors}
            ruleErrors={ruleErrors}
            isEditingSingleInstance={isEditingSingleInstance}
            isUniqueTypeLocked={isUniqueTypeLocked}
            disciplinas={disciplinas}
            escenarios={escenarios}
            entrenadores={entrenadores}
            onChangeField={onChangeField}
            onAddRule={onAddRule}
            onRemoveRule={onRemoveRule}
            onChangeRuleField={onChangeRuleField}
          />

          {disciplinaHasNiveles ? (
            <div className="mt-6">
              <EntrenamientoCategoriasSection
                categoriasForm={categoriasForm}
                activeNiveles={activeNiveles}
                capacidadMaxima={Number(values.cupo_maximo) || 0}
                totalAsignado={totalAsignado}
                cuposSinCategoria={cuposSinCategoria}
                sumExceedsMax={sumExceedsMax}
                categoriasError={categoriasError}
                onToggle={onToggleCategorias}
                onUpdateCupos={onUpdateCategoriasCupos}
              />
            </div>
          ) : null}

          {/* Restrictions */}
          <div className="mt-6">
            <EntrenamientoRestriccionesSection
              restricciones={restricciones}
              servicios={servicios}
              reservaAntelacionHoras={reservaAntelacionHoras}
              cancelacionAntelacionHoras={cancelacionAntelacionHoras}
              onSetReservaAntelacion={onSetReservaAntelacion}
              onSetCancelacionAntelacion={onSetCancelacionAntelacion}
              onAdd={onAddRestriccion}
              onDuplicate={onDuplicateRestriccion}
              onRemove={onRemoveRestriccion}
              onUpdate={onUpdateRestriccion}
            />
          </div>

          <div className="mt-6">
            <EntrenamientoFormularioSection
              tenantId={tenantId}
              role={role}
              values={values}
              fieldErrors={fieldErrors}
              formularioForm={formularioForm}
              plantillas={formulariosPlantillas}
              onChangeFormularioExterno={(value) => onChangeField('formulario_externo', value)}
              onChangeTipo={onChangeFormularioTipo}
              onChangePlantillaId={onChangeFormularioPlantillaId}
              onChangeObligatorio={onChangeFormularioObligatorio}
            />
          </div>

          {submitError ? (
            <div className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          {mode === 'create' ? (
            <button
              type="button"
              aria-label="Guardar configuración como plantilla"
              onClick={onOpenGuardarPlantillaModal}
              disabled={isSubmitting || !values.disciplina_id || !values.escenario_id}
              className="inline-flex items-center gap-2 rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-turquoise/70 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">
                bookmark_add
              </span>
              Guardar como plantilla
            </button>
          ) : null}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep"
          >
            {isSubmitting ? 'Guardando...' : mode === 'create' ? 'Crear entrenamiento' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>

      {mode === 'create' ? (
        <>
          <GuardarPlantillaModal
            open={isGuardarPlantillaModalOpen}
            isSaving={isSavingPlantilla}
            error={guardarPlantillaError}
            onClose={onCloseGuardarPlantillaModal}
            onSave={onGuardarPlantilla}
          />
          <PlantillasListModal
            open={isPlantillasListModalOpen}
            plantillas={plantillas}
            isLoading={plantillasLoading}
            error={plantillasError}
            onClose={onClosePlantillasListModal}
            onUsePlantilla={onAplicarPlantilla}
            onDeletePlantilla={onEliminarPlantilla}
          />
        </>
      ) : null}
    </div>
  );
}
