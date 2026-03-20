'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PlanTipo, PlanWithDisciplinas } from '@/types/portal/planes.types';
import type { MetodoPago } from '@/types/portal/metodos-pago.types';
import { getActiveTipos } from '@/hooks/portal/planes/usePlanesView';

type SuscripcionModalProps = {
  open: boolean;
  plan: PlanWithDisciplinas | null;
  isSubmitting: boolean;
  error: string | null;
  isDuplicate: boolean;
  checkingDuplicate: boolean;
  metodosPago: MetodoPago[];
  metodosPagoError: string | null;
  selectedTipoId: string | null;
  onSelectTipo: (id: string) => void;
  onConfirm: (data: { comentarios: string; metodo_pago_id: string }) => void;
  onClose: () => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

export function SuscripcionModal({
  open,
  plan,
  isSubmitting,
  error,
  isDuplicate,
  checkingDuplicate,
  metodosPago,
  metodosPagoError,
  selectedTipoId,
  onSelectTipo,
  onConfirm,
  onClose,
}: SuscripcionModalProps) {
  const [comentarios, setComentarios] = useState('');
  const [selectedMetodoId, setSelectedMetodoId] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const activeTipos: PlanTipo[] = plan ? getActiveTipos(plan) : [];
  const hasSubtypes = activeTipos.length > 0;

  // Reset step when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep(hasSubtypes ? 1 : 2);
      setComentarios('');
      setSelectedMetodoId('');
      setFileName(null);
      setFileError(null);
    }
  }, [open, hasSubtypes]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];

    if (!file) {
      setFileName(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setFileError('Solo se permiten imágenes (JPEG, PNG, GIF, WebP) o PDF.');
      setFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedMetodoId) return;
    onConfirm({ comentarios, metodo_pago_id: selectedMetodoId });
  }, [comentarios, selectedMetodoId, onConfirm]);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    setStep(1);
    setComentarios('');
    setSelectedMetodoId('');
    setFileName(null);
    setFileError(null);
    onClose();
  }, [isSubmitting, onClose]);

  if (!open || !plan) return null;

  const selectedTipo = activeTipos.find((t) => t.id === selectedTipoId) ?? null;
  const vigencia = plan.vigencia_meses === 1 ? '1 mes' : `${plan.vigencia_meses} meses`;
  const clasesLabel = plan.clases_incluidas != null ? `${plan.clases_incluidas} clases` : 'Ilimitadas';
  const selectedMetodo = metodosPago.find((m) => m.id === selectedMetodoId) ?? null;
  const confirmDisabled = isSubmitting || isDuplicate || checkingDuplicate || !selectedMetodoId;

  const modalTitle =
    step === 2 && selectedTipo
      ? `Suscribirse a ${plan.nombre} — ${selectedTipo.nombre}`
      : 'Adquirir Plan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="glass relative z-10 mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="suscripcion-modal-title"
      >
        <h2
          id="suscripcion-modal-title"
          className="text-xl font-semibold text-slate-100"
        >
          {modalTitle}
        </h2>

        {/* Error / duplicate guard */}
        {error ? (
          <div
            className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {/* ── Step 1: Subtype selection ── */}
        {step === 1 && hasSubtypes ? (
          <>
            <p className="mt-4 text-sm text-slate-400">
              Selecciona una opción para el plan <span className="font-medium text-slate-200">{plan.nombre}</span>:
            </p>

            <div className="mt-3 grid gap-3">
              {activeTipos.map((tipo) => {
                const isSelected = selectedTipoId === tipo.id;
                const tipoVigencia =
                  tipo.vigencia_dias === 1
                    ? '1 día'
                    : tipo.vigencia_dias === 30
                      ? '1 mes'
                      : `${tipo.vigencia_dias} días`;
                const tipoClases =
                  tipo.clases_incluidas != null ? `${tipo.clases_incluidas} clases` : 'Ilimitadas';

                return (
                  <button
                    key={tipo.id}
                    type="button"
                    onClick={() => onSelectTipo(tipo.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected
                        ? 'border-turquoise bg-turquoise/10'
                        : 'border-portal-border bg-navy-medium/50 hover:border-turquoise/40'
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-100">{tipo.nombre}</p>
                    {tipo.descripcion ? (
                      <p className="mt-1 text-xs text-slate-400">{tipo.descripcion}</p>
                    ) : null}
                    <div className="mt-2 flex gap-4 text-xs text-slate-300">
                      <span>
                        <span className="font-medium text-slate-400">Precio:</span>{' '}
                        {formatCurrency(tipo.precio)}
                      </span>
                      <span>
                        <span className="font-medium text-slate-400">Vigencia:</span>{' '}
                        {tipoVigencia}
                      </span>
                      <span>
                        <span className="font-medium text-slate-400">Clases:</span>{' '}
                        {tipoClases}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Step 1 buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-portal-border bg-navy-medium px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-turquoise"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedTipoId}
                onClick={() => setStep(2)}
                className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </>
        ) : null}

        {/* ── Step 2: Payment form ── */}
        {step === 2 ? (
          <>
            {/* Plan / subtype summary */}
            <div className="mt-4 rounded-lg border border-portal-border bg-navy-medium/50 p-4">
              <p className="text-sm font-semibold text-slate-100">{plan.nombre}</p>
              <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-slate-300">
                <div>
                  <span className="block font-medium text-slate-400">Precio</span>
                  {formatCurrency(selectedTipo?.precio ?? plan.precio)}
                </div>
                <div>
                  <span className="block font-medium text-slate-400">Vigencia</span>
                  {selectedTipo
                    ? selectedTipo.vigencia_dias === 1
                      ? '1 día'
                      : selectedTipo.vigencia_dias === 30
                        ? '1 mes'
                        : `${selectedTipo.vigencia_dias} días`
                    : vigencia}
                </div>
                <div>
                  <span className="block font-medium text-slate-400">Clases</span>
                  {selectedTipo
                    ? selectedTipo.clases_incluidas != null
                      ? `${selectedTipo.clases_incluidas} clases`
                      : 'Ilimitadas'
                    : clasesLabel}
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="mt-4 space-y-4">
              {/* Método de pago */}
              <div>
                <label
                  htmlFor="suscripcion-metodo-pago"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Método de pago <span className="text-rose-400">*</span>
                </label>
                {metodosPagoError ? (
                  <div
                    className="rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200"
                    role="alert"
                  >
                    {metodosPagoError}
                  </div>
                ) : metodosPago.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    No hay métodos de pago disponibles. Contacta al administrador.
                  </p>
                ) : (
                  <>
                    <select
                      id="suscripcion-metodo-pago"
                      value={selectedMetodoId}
                      onChange={(e) => setSelectedMetodoId(e.target.value)}
                      disabled={isSubmitting || isDuplicate}
                      className="w-full rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-2 text-sm text-slate-200 focus:border-turquoise/60 focus:outline-none focus:ring-1 focus:ring-turquoise/40 disabled:opacity-50"
                    >
                      <option value="">Selecciona un método de pago</option>
                      {metodosPago.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>

                    {selectedMetodo ? (
                      <div className="mt-2 rounded-lg border border-portal-border bg-navy-deep/40 px-3 py-2 text-xs text-slate-300 space-y-1">
                        {selectedMetodo.valor ? (
                          <p>
                            <span className="font-medium text-slate-400">Número:</span>{' '}
                            {selectedMetodo.valor}
                          </p>
                        ) : null}
                        {selectedMetodo.url ? (
                          <p>
                            <span className="font-medium text-slate-400">Enlace:</span>{' '}
                            <a
                              href={selectedMetodo.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-turquoise underline"
                            >
                              {selectedMetodo.url}
                            </a>
                          </p>
                        ) : null}
                        {selectedMetodo.comentarios ? (
                          <p>
                            <span className="font-medium text-slate-400">Instrucciones:</span>{' '}
                            {selectedMetodo.comentarios}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              {/* Comentarios */}
              <div>
                <label
                  htmlFor="suscripcion-comentarios"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Comentarios <span className="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="suscripcion-comentarios"
                  rows={3}
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  disabled={isSubmitting || isDuplicate}
                  placeholder="Agrega un comentario o nota para el administrador..."
                  className="w-full rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-turquoise/60 focus:outline-none focus:ring-1 focus:ring-turquoise/40 disabled:opacity-50"
                />
              </div>

              {/* Comprobante de pago */}
              <div>
                <label
                  htmlFor="suscripcion-comprobante"
                  className="mb-1 block text-xs font-medium text-slate-300"
                >
                  Comprobante de pago <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  id="suscripcion-comprobante"
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={isSubmitting || isDuplicate}
                  onChange={handleFileChange}
                  className="w-full rounded-lg border border-portal-border bg-navy-deep/60 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-turquoise/20 file:px-2 file:py-1 file:text-xs file:font-medium file:text-turquoise disabled:opacity-50"
                />
                {fileName ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Archivo seleccionado: <span className="font-medium text-slate-300">{fileName}</span>
                  </p>
                ) : null}
                {fileError ? (
                  <p className="mt-1 text-xs text-rose-300" role="alert">
                    {fileError}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Step 2 buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              {hasSubtypes ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="rounded-lg border border-portal-border bg-navy-medium px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-turquoise disabled:opacity-50"
                >
                  Volver
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="rounded-lg border border-portal-border bg-navy-medium px-4 py-2 text-sm font-semibold text-slate-200 transition hover:text-turquoise disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirmDisabled}
                className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
