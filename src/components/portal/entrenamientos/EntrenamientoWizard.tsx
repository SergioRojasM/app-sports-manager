import type {
  SelectOption,
  TrainingFieldErrors,
  TrainingRuleErrors,
  TrainingWizardRuleFormValue,
  TrainingWizardValues,
} from '@/types/portal/entrenamientos.types';

type EntrenamientoWizardProps = {
  values: TrainingWizardValues;
  fieldErrors: TrainingFieldErrors;
  ruleErrors: TrainingRuleErrors;
  isEditingSingleInstance: boolean;
  isUniqueTypeLocked: boolean;
  disciplinas: SelectOption[];
  escenarios: SelectOption[];
  entrenadores: SelectOption[];
  onChangeField: (field: keyof TrainingWizardValues, value: string) => void;
  onAddRule: () => void;
  onRemoveRule: (index: number) => void;
  onChangeRuleField: (index: number, field: keyof TrainingWizardRuleFormValue, value: string | string[]) => void;
};

const WEEK_DAYS = [
  { value: '1', label: 'Lunes' },
  { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' },
  { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },
  { value: '6', label: 'Sábado' },
  { value: '0', label: 'Domingo' },
];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`);

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

export function EntrenamientoWizard({
  values,
  fieldErrors,
  ruleErrors,
  isEditingSingleInstance,
  isUniqueTypeLocked,
  disciplinas,
  escenarios,
  entrenadores,
  onChangeField,
  onAddRule,
  onRemoveRule,
  onChangeRuleField,
}: EntrenamientoWizardProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-grit-lg border border-grit-glass-border bg-grit-bg/45 p-4">
        <h3 className="font-grit-title text-sm font-semibold text-grit-text">1. Datos base</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Nombre</label>
            <input
              value={values.nombre}
              onChange={(event) => onChangeField('nombre', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
              placeholder="Entrenamiento funcional"
            />
            <InputError message={fieldErrors.nombre} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Disciplina *</label>
            <select
              value={values.disciplina_id}
              onChange={(event) => onChangeField('disciplina_id', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            >
              <option value="">Selecciona una disciplina</option>
              {disciplinas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <InputError message={fieldErrors.disciplina_id} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Escenario *</label>
            <select
              value={values.escenario_id}
              onChange={(event) => onChangeField('escenario_id', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            >
              <option value="">Selecciona un escenario</option>
              {escenarios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <InputError message={fieldErrors.escenario_id} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Entrenador</label>
            <select
              value={values.entrenador_id}
              onChange={(event) => onChangeField('entrenador_id', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            >
              <option value="">Sin entrenador</option>
              {entrenadores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Duración (min)</label>
            <input
              type="number"
              value={values.duracion_minutos}
              onChange={(event) => onChangeField('duracion_minutos', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            />
            <InputError message={fieldErrors.duracion_minutos} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Cupo máximo</label>
            <input
              type="number"
              value={values.cupo_maximo}
              onChange={(event) => onChangeField('cupo_maximo', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            />
            <InputError message={fieldErrors.cupo_maximo} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-grit-subtext">Descripción</label>
            <textarea
              rows={3}
              value={values.descripcion}
              onChange={(event) => onChangeField('descripcion', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="punto_encuentro" className="mb-1 block text-xs text-grit-subtext">Punto de encuentro</label>
            <input
              id="punto_encuentro"
              type="text"
              maxLength={200}
              value={values.punto_encuentro}
              onChange={(event) => onChangeField('punto_encuentro', event.target.value)}
              className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
              placeholder="Ej. Entrada principal del estadio, puerta norte..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-grit-subtext">Visibilidad</label>
            <div className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-subtext">
              {values.visibilidad === 'publico' ? 'Público' : 'Privado'}
            </div>
            <p className="mt-1 text-xs text-grit-subtext">
              Los entrenamientos se crean privados. Podrás publicarlos públicamente después, desde las opciones del entrenamiento.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-grit-lg border border-grit-glass-border bg-grit-bg/45 p-4">
        <h3 className="font-grit-title text-sm font-semibold text-grit-text">2. Tipo y programación</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-grit-subtext">Tipo *</label>
            {isEditingSingleInstance || isUniqueTypeLocked ? (
              <div className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-subtext">
                {values.tipo === 'unico' ? 'Único' : 'Recurrente'}
              </div>
            ) : (
              <select
                value={values.tipo}
                onChange={(event) => onChangeField('tipo', event.target.value as 'unico' | 'recurrente')}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
              >
                <option value="unico">Único</option>
                <option value="recurrente">Serie</option>
              </select>
            )}
            <InputError message={fieldErrors.tipo} />
          </div>

          {!isEditingSingleInstance && values.tipo === 'recurrente' ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-grit-subtext">Fecha inicio Serie*</label>
                  <input
                    type="date"
                    value={values.fecha_inicio}
                    onChange={(event) => onChangeField('fecha_inicio', event.target.value)}
                    className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                  />
                  <InputError message={fieldErrors.fecha_inicio} />
                </div>
                
                <div>
                  <label className="mb-1 block text-xs text-grit-subtext">Fecha fin Serie</label>
                  <input
                    type="date"
                    value={values.fecha_fin}
                    onChange={(event) => onChangeField('fecha_fin', event.target.value)}
                    className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                  />
                  <InputError message={fieldErrors.fecha_fin} />
                </div>
            </div>
          ) : null}

          

          {values.tipo === 'unico' ? (
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Fecha y hora *</label>
              <input
                type="datetime-local"
                value={values.fecha_hora_unico}
                onChange={(event) => onChangeField('fecha_hora_unico', event.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
              />
              <InputError message={fieldErrors.fecha_hora_unico} />
            </div>
          ) : null}
        </div>

        {values.tipo === 'recurrente' ? (
          <div className="space-y-3">
            <div className="rounded-grit-md border border-grit-glass-border p-3">
              <p className="text-xs font-semibold text-grit-text">Recurrencia semanal</p>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {WEEK_DAYS.map((day) => {
                  const checked = values.dias_semana.includes(day.value);
                  return (
                    <label key={day.value} className="inline-flex items-center gap-2 text-xs text-grit-text">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            const next = Array.from(new Set([...values.dias_semana, day.value]));
                            onChangeField('dias_semana', next.join(','));
                          } else {
                            const next = values.dias_semana.filter((value) => value !== day.value);
                            onChangeField('dias_semana', next.join(','));
                          }
                        }}
                        className="rounded border-grit-glass-border bg-grit-bg"
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              <InputError message={fieldErrors.dias_semana} />

              <div className="mt-3 max-w-xs">
                <label className="mb-1 block text-xs text-grit-subtext">Repetir cada __ semanas</label>
                <input
                  type="number"
                  min={1}
                  value={values.repetir_cada_semanas}
                  onChange={(event) => onChangeField('repetir_cada_semanas', event.target.value)}
                  className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                />
                <InputError message={fieldErrors.repetir_cada_semanas} />
              </div>
            </div>

            <p className="text-xs font-semibold text-grit-text">Recurrencia horaria</p>
            <div>
              <button
                type="button"
                onClick={onAddRule}
                className="rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-xs font-semibold text-grit-text"
              >
                + Agregar bloque horario
              </button>
            </div>

            {values.reglas.map((rule, index) => {
              const errors = ruleErrors[index] ?? {};
              return (
                <div key={`${index}-${rule.tipo_bloque}-${rule.hora_inicio}-${rule.hora_fin}`} className="space-y-3 rounded-grit-md border border-grit-glass-border bg-grit-bg/40 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                      <label className="mb-1 block text-[11px] text-grit-subtext">Tipo de bloque</label>
                      <select
                        value={rule.tipo_bloque}
                        onChange={(event) =>
                          onChangeRuleField(index, 'tipo_bloque', event.target.value as TrainingWizardRuleFormValue['tipo_bloque'])
                        }
                        className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                      >
                        <option value="una_vez_dia">Una vez al día</option>
                        <option value="franja_repeticion">Franja con repetición por duración</option>
                        {/* <option value="horas_especificas">Horas específicas</option> */}
                      </select>
                      <InputError message={errors.tipo_bloque} />
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveRule(index)}
                      className="rounded-grit-md border border-grit-danger/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-grit-danger"
                    >
                      Quitar regla
                    </button>
                  </div>

                  {rule.tipo_bloque === 'una_vez_dia' ? (
                    <div>
                      <label className="mb-1 block text-[11px] text-grit-subtext">Hora inicio</label>
                      <input
                        type="time"
                        value={rule.hora_inicio}
                        onChange={(event) => onChangeRuleField(index, 'hora_inicio', event.target.value)}
                        className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                      />
                      <p className="mt-1 text-[11px] text-grit-subtext">Hora fin automática = inicio + duración global.</p>
                      <InputError message={errors.hora_inicio} />
                    </div>
                  ) : null}

                  {rule.tipo_bloque === 'franja_repeticion' ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-grit-subtext">Hora inicio franja</label>
                        <input
                          type="time"
                          value={rule.hora_inicio}
                          onChange={(event) => onChangeRuleField(index, 'hora_inicio', event.target.value)}
                          className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                        />
                        <InputError message={errors.hora_inicio} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-grit-subtext">Hora fin franja</label>
                        <input
                          type="time"
                          value={rule.hora_fin}
                          onChange={(event) => onChangeRuleField(index, 'hora_fin', event.target.value)}
                          className="w-full rounded-grit-md border border-grit-glass-border bg-grit-bg px-3 py-2 text-sm text-grit-text"
                        />
                        <InputError message={errors.hora_fin} />
                      </div>
                    </div>
                  ) : null}

                  {rule.tipo_bloque === 'horas_especificas' ? (
                    <div>
                      <p className="mb-1 text-[11px] text-grit-subtext">Horas específicas</p>
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-6 xl:grid-cols-8">
                        {HOUR_OPTIONS.map((hour) => {
                          const checked = rule.horas_especificas.includes(hour);
                          return (
                            <label key={hour} className="inline-flex items-center gap-1 text-[11px] text-grit-text">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  if (event.target.checked) {
                                    const next = Array.from(new Set([...rule.horas_especificas, hour])).sort();
                                    onChangeRuleField(index, 'horas_especificas', next);
                                  } else {
                                    const next = rule.horas_especificas.filter((value) => value !== hour);
                                    onChangeRuleField(index, 'horas_especificas', next);
                                  }
                                }}
                                className="rounded border-grit-glass-border bg-grit-bg"
                              />
                              {hour}
                            </label>
                          );
                        })}
                      </div>
                      <InputError message={errors.horas_especificas} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
