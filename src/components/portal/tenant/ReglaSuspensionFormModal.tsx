'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  ReglaSuspension,
  ReglaSuspensionCreatePayload,
  ReglaSuspensionUpdatePayload,
} from '@/types/portal/reglas-suspension.types';

type ReglaSuspensionFormModalProps = {
  open: boolean;
  tenantId: string;
  mode: 'create' | 'edit';
  editTarget: ReglaSuspension | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onCreate: (payload: ReglaSuspensionCreatePayload) => Promise<void>;
  onUpdate: (id: string, payload: ReglaSuspensionUpdatePayload) => Promise<void>;
};

type FieldErrors = {
  nombre?: string;
  num_inasistencias?: string;
  condicion?: string;
  por_dias_atras?: string;
  duracion?: string;
};

export function ReglaSuspensionFormModal({
  open,
  tenantId,
  mode,
  editTarget,
  isSubmitting,
  submitError,
  onClose,
  onCreate,
  onUpdate,
}: ReglaSuspensionFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [numInasistencias, setNumInasistencias] = useState('1');
  const [porSuscripcion, setPorSuscripcion] = useState(false);
  const [porDiasAtras, setPorDiasAtras] = useState('0');
  const [duracion, setDuracion] = useState('0');
  const [activo, setActivo] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (open && editTarget && mode === 'edit') {
      setNombre(editTarget.nombre);
      setNumInasistencias(String(editTarget.num_inasistencias));
      setPorSuscripcion(editTarget.por_suscripcion);
      setPorDiasAtras(String(editTarget.por_dias_atras));
      setDuracion(String(editTarget.duracion));
      setActivo(editTarget.activo);
      setFieldErrors({});
    } else if (open && mode === 'create') {
      setNombre('');
      setNumInasistencias('1');
      setPorSuscripcion(false);
      setPorDiasAtras('0');
      setDuracion('0');
      setActivo(true);
      setFieldErrors({});
    }
  }, [open, editTarget, mode]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, isSubmitting, onClose]);

  const validate = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};
    if (!nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio.';
    } else if (nombre.trim().length > 100) {
      errors.nombre = 'El nombre no puede exceder 100 caracteres.';
    }
    const parsedNum = parseInt(numInasistencias, 10);
    if (isNaN(parsedNum) || parsedNum < 1) {
      errors.num_inasistencias = 'Debe ser al menos 1.';
    }
    const parsedDias = parseInt(porDiasAtras, 10);
    if (isNaN(parsedDias) || parsedDias < 0) {
      errors.por_dias_atras = 'Debe ser 0 o mayor.';
    }
    const parsedDuracion = parseInt(duracion, 10);
    if (isNaN(parsedDuracion) || parsedDuracion < 0) {
      errors.duracion = 'Debe ser 0 o mayor.';
    }
    if (!porSuscripcion && (isNaN(parsedDias) || parsedDias <= 0)) {
      errors.condicion = 'Debe seleccionar al menos una condición.';
    }
    return errors;
  }, [nombre, numInasistencias, porSuscripcion, porDiasAtras, duracion]);

  const handleSubmit = useCallback(async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const parsedNum = parseInt(numInasistencias, 10);
    const parsedDias = parseInt(porDiasAtras, 10);
    const parsedDuracion = parseInt(duracion, 10);

    try {
      if (mode === 'edit' && editTarget) {
        const payload: ReglaSuspensionUpdatePayload = {
          nombre: nombre.trim(),
          num_inasistencias: parsedNum,
          por_suscripcion: porSuscripcion,
          por_dias_atras: parsedDias,
          duracion: parsedDuracion,
          activo,
        };
        await onUpdate(editTarget.id, payload);
      } else {
        const payload: ReglaSuspensionCreatePayload = {
          tenant_id: tenantId,
          nombre: nombre.trim(),
          num_inasistencias: parsedNum,
          por_suscripcion: porSuscripcion,
          por_dias_atras: parsedDias,
          duracion: parsedDuracion,
          activo,
        };
        await onCreate(payload);
      }
    } catch (err: unknown) {
      const pgError = err as { code?: string };
      if (pgError.code === '23505') {
        setFieldErrors((prev) => ({
          ...prev,
          nombre: 'Ya existe una regla con este nombre.',
        }));
      }
    }
  }, [validate, mode, editTarget, nombre, numInasistencias, porSuscripcion, porDiasAtras, duracion, activo, tenantId, onCreate, onUpdate]);

  if (!open) return null;

  const parsedDiasDisplay = parseInt(porDiasAtras, 10);
  const parsedDuracionDisplay = parseInt(duracion, 10);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de regla de suspensión"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear regla de suspensión' : 'Editar regla de suspensión'}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Crear regla de suspensión' : 'Editar regla de suspensión'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura los parámetros de la regla de suspensión automática.
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

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Nombre */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="rs-nombre"
            >
              Nombre
            </label>
            <input
              id="rs-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isSubmitting}
              maxLength={100}
              placeholder="Ej: Suspensión por acumulación mensual"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.nombre
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.nombre ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.nombre}
              </p>
            ) : null}
          </div>

          {/* Número de inasistencias */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="rs-num-inasistencias"
            >
              Número de inasistencias
            </label>
            <input
              id="rs-num-inasistencias"
              type="number"
              min={1}
              step={1}
              value={numInasistencias}
              onChange={(e) => setNumInasistencias(e.target.value)}
              disabled={isSubmitting}
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.num_inasistencias
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.num_inasistencias ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.num_inasistencias}
              </p>
            ) : null}
          </div>

          {/* Por suscripción toggle */}
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={porSuscripcion}
                onClick={() => setPorSuscripcion(!porSuscripcion)}
                disabled={isSubmitting}
                className={[
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-turquoise/40 focus:ring-offset-2 focus:ring-offset-navy-medium disabled:opacity-50',
                  porSuscripcion ? 'bg-turquoise' : 'bg-slate-600',
                ].join(' ')}
              >
                <span
                  className={[
                    'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                    porSuscripcion ? 'translate-x-5' : 'translate-x-0',
                  ].join(' ')}
                />
              </button>
              <span className="text-sm text-slate-300">
                Contar inasistencias en la suscripción activa
              </span>
            </div>
          </div>

          {/* Por días atrás */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="rs-por-dias-atras"
            >
              En los últimos N días
            </label>
            <input
              id="rs-por-dias-atras"
              type="number"
              min={0}
              step={1}
              value={porDiasAtras}
              onChange={(e) => setPorDiasAtras(e.target.value)}
              disabled={isSubmitting}
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.por_dias_atras
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {!isNaN(parsedDiasDisplay) && parsedDiasDisplay === 0 ? (
              <p className="mt-1 text-xs text-slate-500">No aplica</p>
            ) : null}
            {fieldErrors.por_dias_atras ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.por_dias_atras}
              </p>
            ) : null}
          </div>

          {/* Condición error (cross-field) */}
          {fieldErrors.condicion ? (
            <div
              className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {fieldErrors.condicion}
            </div>
          ) : null}

          {/* Duración */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="rs-duracion"
            >
              Duración de la suspensión (días)
            </label>
            <input
              id="rs-duracion"
              type="number"
              min={0}
              step={1}
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              disabled={isSubmitting}
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.duracion
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {!isNaN(parsedDuracionDisplay) && parsedDuracionDisplay === 0 ? (
              <p className="mt-1 text-xs text-slate-500">Permanente (sin límite de días)</p>
            ) : null}
            {fieldErrors.duracion ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.duracion}
              </p>
            ) : null}
          </div>

          {/* Activo toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={activo}
              onClick={() => setActivo(!activo)}
              disabled={isSubmitting}
              className={[
                'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-turquoise/40 focus:ring-offset-2 focus:ring-offset-navy-medium disabled:opacity-50',
                activo ? 'bg-turquoise' : 'bg-slate-600',
              ].join(' ')}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
                  activo ? 'translate-x-5' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
            <span className="text-sm text-slate-300">
              {activo ? 'Regla activa' : 'Regla inactiva'}
            </span>
          </div>

          {submitError ? (
            <div
              className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
              role="alert"
            >
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
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
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? 'Guardando...'
              : mode === 'create'
                ? 'Crear regla'
                : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
