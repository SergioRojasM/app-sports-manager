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
    <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
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
      <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
        <h3 className="text-sm font-semibold text-slate-100">1. Datos base</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-300">Nombre</label>
            <input
              value={values.nombre}
              onChange={(event) => onChangeField('nombre', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              placeholder="Entrenamiento funcional"
            />
            <InputError message={fieldErrors.nombre} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Disciplina *</label>
            <select
              value={values.disciplina_id}
              onChange={(event) => onChangeField('disciplina_id', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
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
            <label className="mb-1 block text-xs text-slate-300">Escenario *</label>
            <select
              value={values.escenario_id}
              onChange={(event) => onChangeField('escenario_id', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
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
            <label className="mb-1 block text-xs text-slate-300">Entrenador</label>
            <select
              value={values.entrenador_id}
              onChange={(event) => onChangeField('entrenador_id', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
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
            <label className="mb-1 block text-xs text-slate-300">Duración (min)</label>
            <input
              type="number"
              value={values.duracion_minutos}
              onChange={(event) => onChangeField('duracion_minutos', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
            />
            <InputError message={fieldErrors.duracion_minutos} />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-300">Cupo máximo</label>
            <input
              type="number"
              value={values.cupo_maximo}
              onChange={(event) => onChangeField('cupo_maximo', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
            />
            <InputError message={fieldErrors.cupo_maximo} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Descripción</label>
            <textarea
              rows={3}
              value={values.descripcion}
              onChange={(event) => onChangeField('descripcion', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="punto_encuentro" className="mb-1 block text-xs text-slate-300">Punto de encuentro</label>
            <input
              id="punto_encuentro"
              type="text"
              maxLength={200}
              value={values.punto_encuentro}
              onChange={(event) => onChangeField('punto_encuentro', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              placeholder="Ej. Entrada principal del estadio, puerta norte..."
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="formulario_externo" className="mb-1 block text-xs text-slate-300">Formulario externo</label>
            <input
              id="formulario_externo"
              type="url"
              maxLength={500}
              value={values.formulario_externo}
              onChange={(event) => onChangeField('formulario_externo', event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              placeholder="https://"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Visibilidad</label>
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="visibilidad"
                  value="privado"
                  checked={values.visibilidad === 'privado'}
                  onChange={() => onChangeField('visibilidad', 'privado')}
                  className="accent-turquoise"
                />
                Privado
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="radio"
                  name="visibilidad"
                  value="publico"
                  checked={values.visibilidad === 'publico'}
                  onChange={() => onChangeField('visibilidad', 'publico')}
                  className="accent-turquoise"
                />
                Público
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {values.visibilidad === 'publico'
                ? 'Este entrenamiento será visible públicamente y podrá ser descubierto por atletas fuera de tu organización.'
                : 'Este entrenamiento solo será visible para los miembros de tu organización.'}
            </p>
            <InputError message={fieldErrors.visibilidad} />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
        <h3 className="text-sm font-semibold text-slate-100">2. Tipo y programación</h3>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-300">Tipo *</label>
            {isEditingSingleInstance || isUniqueTypeLocked ? (
              <div className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-300">
                {values.tipo === 'unico' ? 'Único' : 'Recurrente'}
              </div>
            ) : (
              <select
                value={values.tipo}
                onChange={(event) => onChangeField('tipo', event.target.value as 'unico' | 'recurrente')}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
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
                  <label className="mb-1 block text-xs text-slate-300">Fecha inicio Serie*</label>
                  <input
                    type="date"
                    value={values.fecha_inicio}
                    onChange={(event) => onChangeField('fecha_inicio', event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                  />
                  <InputError message={fieldErrors.fecha_inicio} />
                </div>
                
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Fecha fin Serie</label>
                  <input
                    type="date"
                    value={values.fecha_fin}
                    onChange={(event) => onChangeField('fecha_fin', event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                  />
                  <InputError message={fieldErrors.fecha_fin} />
                </div>
            </div>
          ) : null}

          

          {values.tipo === 'unico' ? (
            <div>
              <label className="mb-1 block text-xs text-slate-300">Fecha y hora *</label>
              <input
                type="datetime-local"
                value={values.fecha_hora_unico}
                onChange={(event) => onChangeField('fecha_hora_unico', event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
              />
              <InputError message={fieldErrors.fecha_hora_unico} />
            </div>
          ) : null}
        </div>

        {values.tipo === 'recurrente' ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-portal-border p-3">
              <p className="text-xs font-semibold text-slate-200">Recurrencia semanal</p>

              <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                {WEEK_DAYS.map((day) => {
                  const checked = values.dias_semana.includes(day.value);
                  return (
                    <label key={day.value} className="inline-flex items-center gap-2 text-xs text-slate-200">
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
                        className="rounded border-slate-600 bg-navy-deep"
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
              <InputError message={fieldErrors.dias_semana} />

              <div className="mt-3 max-w-xs">
                <label className="mb-1 block text-xs text-slate-300">Repetir cada __ semanas</label>
                <input
                  type="number"
                  min={1}
                  value={values.repetir_cada_semanas}
                  onChange={(event) => onChangeField('repetir_cada_semanas', event.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                />
                <InputError message={fieldErrors.repetir_cada_semanas} />
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-200">Recurrencia horaria</p>
            <div>
              <button
                type="button"
                onClick={onAddRule}
                className="rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-xs font-semibold text-slate-200"
              >
                + Agregar bloque horario
              </button>
            </div>

            {values.reglas.map((rule, index) => {
              const errors = ruleErrors[index] ?? {};
              return (
                <div key={`${index}-${rule.tipo_bloque}-${rule.hora_inicio}-${rule.hora_fin}`} className="space-y-3 rounded-lg border border-portal-border bg-navy-deep/40 p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-300">Tipo de bloque</label>
                      <select
                        value={rule.tipo_bloque}
                        onChange={(event) =>
                          onChangeRuleField(index, 'tipo_bloque', event.target.value as TrainingWizardRuleFormValue['tipo_bloque'])
                        }
                        className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
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
                      className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200"
                    >
                      Quitar regla
                    </button>
                  </div>

                  {rule.tipo_bloque === 'una_vez_dia' ? (
                    <div>
                      <label className="mb-1 block text-[11px] text-slate-300">Hora inicio</label>
                      <input
                        type="time"
                        value={rule.hora_inicio}
                        onChange={(event) => onChangeRuleField(index, 'hora_inicio', event.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                      />
                      <p className="mt-1 text-[11px] text-slate-400">Hora fin automática = inicio + duración global.</p>
                      <InputError message={errors.hora_inicio} />
                    </div>
                  ) : null}

                  {rule.tipo_bloque === 'franja_repeticion' ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-300">Hora inicio franja</label>
                        <input
                          type="time"
                          value={rule.hora_inicio}
                          onChange={(event) => onChangeRuleField(index, 'hora_inicio', event.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                        />
                        <InputError message={errors.hora_inicio} />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-slate-300">Hora fin franja</label>
                        <input
                          type="time"
                          value={rule.hora_fin}
                          onChange={(event) => onChangeRuleField(index, 'hora_fin', event.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-navy-deep px-3 py-2 text-sm text-slate-100"
                        />
                        <InputError message={errors.hora_fin} />
                      </div>
                    </div>
                  ) : null}

                  {rule.tipo_bloque === 'horas_especificas' ? (
                    <div>
                      <p className="mb-1 text-[11px] text-slate-300">Horas específicas</p>
                      <div className="grid grid-cols-3 gap-2 md:grid-cols-6 xl:grid-cols-8">
                        {HOUR_OPTIONS.map((hour) => {
                          const checked = rule.horas_especificas.includes(hour);
                          return (
                            <label key={hour} className="inline-flex items-center gap-1 text-[11px] text-slate-200">
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
                                className="rounded border-slate-600 bg-navy-deep"
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
