import type {
  PerfilFieldErrors,
  PerfilFormField,
  PerfilFormValues,
} from '@/types/portal/perfil.types';

const TIPO_IDENTIFICACION_OPTIONS = [
  { value: '', label: '— Selecciona —' },
  { value: 'CC', label: 'Cédula de Ciudadanía (CC)' },
  { value: 'CE', label: 'Cédula de Extranjería (CE)' },
  { value: 'TI', label: 'Tarjeta de Identidad (TI)' },
  { value: 'NIT', label: 'NIT' },
  { value: 'Pasaporte', label: 'Pasaporte' },
  { value: 'Otro', label: 'Otro' },
];

const RH_OPTIONS = [
  { value: '', label: '— Selecciona —' },
  { value: 'O+', label: 'O+' },
  { value: 'O−', label: 'O−' },
  { value: 'A+', label: 'A+' },
  { value: 'A−', label: 'A−' },
  { value: 'B+', label: 'B+' },
  { value: 'B−', label: 'B−' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB−', label: 'AB−' },
];

type PerfilPersonalFormProps = {
  formValues: PerfilFormValues;
  fieldErrors: PerfilFieldErrors;
  email: string;
  updateField: (field: PerfilFormField, value: string) => void;
};

type InputFieldProps = {
  id: string;
  label: string;
  icon: string;
  error?: string;
  children: React.ReactNode;
};

function FormField({ id, label, icon, error, children }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </label>
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-slate-500">
          {icon}
        </span>
        {children}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full rounded-xl border border-portal-border bg-white/5 py-2.5 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

const readonlyClass =
  'w-full rounded-xl border border-portal-border bg-white/[0.02] py-2.5 pl-10 pr-3 text-sm text-slate-400 outline-none cursor-not-allowed';

const selectClass =
  'w-full rounded-xl border border-portal-border bg-[#1e293b] py-2.5 pl-10 pr-3 text-sm text-slate-100 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500';

export function PerfilPersonalForm({
  formValues,
  fieldErrors,
  email,
  updateField,
}: PerfilPersonalFormProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
        Información Personal
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Nombre */}
        <FormField
          id="nombre"
          label="Nombre"
          icon="person"
          error={fieldErrors.nombre}
        >
          <input
            id="nombre"
            type="text"
            value={formValues.nombre}
            onChange={(e) => updateField('nombre', e.target.value)}
            placeholder="Tu nombre"
            autoComplete="given-name"
            className={inputClass}
          />
        </FormField>

        {/* Apellido */}
        <FormField
          id="apellido"
          label="Apellido"
          icon="person"
          error={fieldErrors.apellido}
        >
          <input
            id="apellido"
            type="text"
            value={formValues.apellido}
            onChange={(e) => updateField('apellido', e.target.value)}
            placeholder="Tu apellido"
            autoComplete="family-name"
            className={inputClass}
          />
        </FormField>

        {/* Correo — read-only */}
        <FormField id="email" label="Correo Electrónico" icon="mail">
          <input
            id="email"
            type="email"
            value={email}
            readOnly
            disabled
            autoComplete="email"
            className={readonlyClass}
            title="El correo electrónico no puede modificarse aquí"
          />
        </FormField>

        {/* Teléfono */}
        <FormField id="telefono" label="Teléfono" icon="phone" error={fieldErrors.telefono}>
          <input
            id="telefono"
            type="tel"
            value={formValues.telefono}
            onChange={(e) => updateField('telefono', e.target.value)}
            placeholder="+57 300 000 0000"
            autoComplete="tel"
            className={inputClass}
          />
        </FormField>

        {/* Fecha de Nacimiento */}
        <FormField
          id="fecha_nacimiento"
          label="Fecha de Nacimiento"
          icon="calendar_today"
          error={fieldErrors.fecha_nacimiento}
        >
          <input
            id="fecha_nacimiento"
            type="date"
            value={formValues.fecha_nacimiento}
            onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
            className={inputClass}
          />
        </FormField>

        {/* RH */}
        <FormField id="rh" label="Grupo Sanguíneo (RH)" icon="water_drop" error={fieldErrors.rh}>
          <select
            id="rh"
            value={formValues.rh}
            onChange={(e) => updateField('rh', e.target.value)}
            className={selectClass}
          >
            {RH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Tipo de Identificación */}
        <FormField
          id="tipo_identificacion"
          label="Tipo de Identificación"
          icon="badge"
          error={fieldErrors.tipo_identificacion}
        >
          <select
            id="tipo_identificacion"
            value={formValues.tipo_identificacion}
            onChange={(e) => updateField('tipo_identificacion', e.target.value)}
            className={selectClass}
          >
            {TIPO_IDENTIFICACION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* N° Identificación */}
        <FormField
          id="numero_identificacion"
          label="N° Identificación"
          icon="badge"
          error={fieldErrors.numero_identificacion}
        >
          <input
            id="numero_identificacion"
            type="text"
            value={formValues.numero_identificacion}
            onChange={(e) => updateField('numero_identificacion', e.target.value)}
            placeholder="Número de documento"
            className={inputClass}
          />
        </FormField>
      </div>
    </section>
  );
}
