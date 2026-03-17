'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  MetodoPago,
  MetodoPagoTipo,
  CreateMetodoPagoInput,
  UpdateMetodoPagoInput,
} from '@/types/portal/metodos-pago.types';

type MetodoPagoFormModalProps = {
  open: boolean;
  tenantId: string;
  editTarget: MetodoPago | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  onSubmit: (data: CreateMetodoPagoInput | UpdateMetodoPagoInput) => Promise<void>;
};

const TIPO_OPTIONS: { value: MetodoPagoTipo; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'pasarela', label: 'Pasarela' },
  { value: 'otro', label: 'Otro' },
];

type FieldErrors = {
  nombre?: string;
  tipo?: string;
  url?: string;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function MetodoPagoFormModal({
  open,
  tenantId,
  editTarget,
  isSubmitting,
  submitError,
  onClose,
  onSubmit,
}: MetodoPagoFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<MetodoPagoTipo | ''>('');
  const [valor, setValor] = useState('');
  const [url, setUrl] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [activo, setActivo] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (open && editTarget) {
      setNombre(editTarget.nombre);
      setTipo(editTarget.tipo);
      setValor(editTarget.valor ?? '');
      setUrl(editTarget.url ?? '');
      setComentarios(editTarget.comentarios ?? '');
      setActivo(editTarget.activo);
      setFieldErrors({});
    } else if (open) {
      setNombre('');
      setTipo('');
      setValor('');
      setUrl('');
      setComentarios('');
      setActivo(true);
      setFieldErrors({});
    }
  }, [open, editTarget]);

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
    if (!nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    if (!tipo) errors.tipo = 'El tipo es obligatorio.';
    if (url.trim() && !isValidUrl(url.trim())) errors.url = 'Ingresa una URL válida (https://…).';
    return errors;
  }, [nombre, tipo, url]);

  const handleSubmit = useCallback(async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editTarget) {
      const payload: UpdateMetodoPagoInput = {
        nombre: nombre.trim(),
        tipo: tipo as MetodoPagoTipo,
        valor: valor.trim() || null,
        url: url.trim() || null,
        comentarios: comentarios.trim() || null,
        activo,
      };
      await onSubmit(payload);
    } else {
      const payload: CreateMetodoPagoInput = {
        tenant_id: tenantId,
        nombre: nombre.trim(),
        tipo: tipo as MetodoPagoTipo,
        valor: valor.trim() || null,
        url: url.trim() || null,
        comentarios: comentarios.trim() || null,
        activo,
      };
      await onSubmit(payload);
    }
  }, [validate, editTarget, nombre, tipo, valor, url, comentarios, activo, tenantId, onSubmit]);

  if (!open) return null;

  const mode = editTarget ? 'edit' : 'create';

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar formulario de método de pago"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'create' ? 'Crear método de pago' : 'Editar método de pago'}
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              {mode === 'create' ? 'Crear método de pago' : 'Editar método de pago'}
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Configura los datos del método de pago para esta organización.
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
              htmlFor="mp-nombre"
            >
              Nombre
            </label>
            <input
              id="mp-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Nequi, Bancolombia, Efectivo"
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

          {/* Tipo */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="mp-tipo"
            >
              Tipo
            </label>
            <select
              id="mp-tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MetodoPagoTipo)}
              disabled={isSubmitting}
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition focus:ring-2',
                fieldErrors.tipo
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            >
              <option value="">Selecciona un tipo</option>
              {TIPO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {fieldErrors.tipo ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.tipo}
              </p>
            ) : null}
          </div>

          {/* Número */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="mp-valor"
            >
              Número <span className="normal-case tracking-normal text-slate-500">(opcional)</span>
            </label>
            <input
              id="mp-valor"
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: cuenta 123-456-789, CBU, número"
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
          </div>

          {/* URL */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="mp-url"
            >
              URL <span className="normal-case tracking-normal text-slate-500">(opcional)</span>
            </label>
            <input
              id="mp-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              placeholder="https://…"
              className={[
                'w-full rounded-xl border bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:ring-2',
                fieldErrors.url
                  ? 'border-rose-400/80 focus:border-rose-300 focus:ring-rose-300/35'
                  : 'border-slate-700 focus:border-turquoise focus:ring-turquoise/35',
              ].join(' ')}
            />
            {fieldErrors.url ? (
              <p className="mt-1 text-xs font-medium text-rose-300" role="alert">
                {fieldErrors.url}
              </p>
            ) : null}
          </div>

          {/* Comentarios */}
          <div>
            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400"
              htmlFor="mp-comentarios"
            >
              Comentarios <span className="normal-case tracking-normal text-slate-500">(opcional)</span>
            </label>
            <textarea
              id="mp-comentarios"
              rows={3}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              disabled={isSubmitting}
              placeholder="Instrucciones de pago, titular de cuenta, etc."
              className="w-full rounded-xl border border-slate-700 bg-navy-deep px-4 py-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-turquoise focus:ring-2 focus:ring-turquoise/35"
            />
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
              {activo ? 'Activo' : 'Inactivo'}
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
                ? 'Crear método'
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
