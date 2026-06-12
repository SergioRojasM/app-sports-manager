'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCrearSuscripcion } from '@/hooks/portal/gestion-suscripciones/useCrearSuscripcion';

type CrearSuscripcionModalProps = {
  open: boolean;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function CrearSuscripcionModal({
  open,
  tenantId,
  onClose,
  onSuccess,
}: CrearSuscripcionModalProps) {
  const {
    step,
    goNext,
    goBack,
    /* Athlete */
    atletaOptions,
    loadingAtletas,
    atletaSearchInput,
    setAtletaSearchInput,
    atletaId,
    setAtletaId,
    /* Plans */
    planes,
    loadingPlanes,
    planId,
    setPlanId,
    planTipoId,
    setPlanTipoId,
    activeTipos,
    /* Step 3 */
    estado,
    setEstado,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    comentarios,
    setComentarios,
    /* Payment */
    crearPago,
    setCrearPago,
    monto,
    setMonto,
    metodosPago,
    loadingMetodosPago,
    metodoPagoId,
    setMetodoPagoId,
    estadoPago,
    setEstadoPago,
    /* Submission */
    isSubmitting,
    errors,
    submit,
    reset,
  } = useCrearSuscripcion({ tenantId, onSuccess });

  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combobox state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);

  // Escape key → close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        reset();
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, isSubmitting, reset]);

  // Auto-focus search input when modal opens on step 1
  useEffect(() => {
    if (open && step === 1) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open, step]);

  // Filtered athlete options
  const filteredAtletas = atletaSearchInput.trim()
    ? atletaOptions.filter((o) => o.searchText.includes(atletaSearchInput.toLowerCase()))
    : atletaOptions;

  const handleAtletaSelect = useCallback(
    (id: string, label: string) => {
      setAtletaId(id);
      setAtletaSearchInput(label);
      setDropdownOpen(false);
      setActiveOptionIndex(-1);
    },
    [setAtletaId, setAtletaSearchInput],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!dropdownOpen && filteredAtletas.length > 0) setDropdownOpen(true);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveOptionIndex((prev) => Math.min(prev + 1, filteredAtletas.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveOptionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeOptionIndex >= 0 && filteredAtletas[activeOptionIndex]) {
          const opt = filteredAtletas[activeOptionIndex];
          handleAtletaSelect(opt.id, opt.label);
        }
      } else if (e.key === 'Escape') {
        setDropdownOpen(false);
      }
    },
    [dropdownOpen, filteredAtletas, activeOptionIndex, handleAtletaSelect],
  );

  if (!open) return null;

  const inputClass =
    'w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-100 outline-none focus:border-turquoise/50 focus:ring-1 focus:ring-turquoise/30 disabled:opacity-50';
  const labelClass = 'mb-1 block text-xs font-medium text-slate-400';
  const cancelBtnClass =
    'rounded-lg border border-portal-border px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.04] disabled:opacity-50';
  const primaryBtnClass =
    'rounded-lg border border-turquoise/40 bg-turquoise/10 px-4 py-2 text-sm font-medium text-turquoise transition-colors hover:bg-turquoise/20 disabled:opacity-50';
  const errorClass =
    'mt-1 text-xs text-rose-300';

  // ─────── Render Step 1: Athlete picker ───────
  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Atleta</label>
        <div className="relative">
          <input
            ref={searchInputRef}
            role="combobox"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            type="text"
            placeholder={loadingAtletas ? 'Cargando atletas…' : 'Buscar atleta…'}
            value={atletaSearchInput}
            disabled={loadingAtletas || isSubmitting}
            onChange={(e) => {
              setAtletaSearchInput(e.target.value);
              setAtletaId('');
              setDropdownOpen(true);
              setActiveOptionIndex(-1);
            }}
            onFocus={() => {
              if (filteredAtletas.length > 0) setDropdownOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => setDropdownOpen(false), 150);
            }}
            onKeyDown={handleSearchKeyDown}
            className={inputClass}
          />
          {dropdownOpen && filteredAtletas.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-portal-border bg-navy-deep shadow-lg"
            >
              {filteredAtletas.map((opt, idx) => (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={opt.id === atletaId}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    idx === activeOptionIndex
                      ? 'bg-turquoise/20 text-turquoise'
                      : 'text-slate-200 hover:bg-white/[0.06]'
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAtletaSelect(opt.id, opt.label);
                  }}
                >
                  <span className="font-medium">{opt.label}</span>
                  {opt.identificacion && (
                    <span className="ml-2 text-xs text-slate-400">{opt.identificacion}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {dropdownOpen && !loadingAtletas && filteredAtletas.length === 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-portal-border bg-navy-deep px-3 py-2 text-sm text-slate-400 shadow-lg">
              Sin resultados
            </div>
          )}
        </div>
        {errors.atleta_id && <p className={errorClass}>{errors.atleta_id}</p>}
      </div>
    </div>
  );

  // ─────── Render Step 2: Plan + subtype ───────
  const renderStep2 = () => (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Plan</label>
        <select
          value={planId}
          onChange={(e) => {
            setPlanId(e.target.value);
            setPlanTipoId(null);
          }}
          disabled={loadingPlanes || isSubmitting}
          className={inputClass}
        >
          {loadingPlanes ? (
            <option value="">Cargando planes…</option>
          ) : (
            <>
              <option value="">Seleccionar plan</option>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </>
          )}
        </select>
        {errors.plan_id && <p className={errorClass}>{errors.plan_id}</p>}
      </div>

      {activeTipos.length > 0 && (
        <div>
          <label className={labelClass}>Subtipo de plan</label>
          <div className="space-y-2">
            {activeTipos.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  planTipoId === t.id
                    ? 'border-turquoise/50 bg-turquoise/5'
                    : 'border-portal-border bg-navy-deep hover:bg-white/[0.04]'
                }`}
              >
                <input
                  type="radio"
                  name="plan_tipo"
                  value={t.id}
                  checked={planTipoId === t.id}
                  onChange={() => setPlanTipoId(t.id)}
                  disabled={isSubmitting}
                  className="mt-0.5 accent-turquoise"
                />
                <div>
                  <span className="text-sm font-medium text-slate-100">{t.nombre}</span>
                  <span className="ml-2 text-xs text-slate-400">
                    {t.vigencia_dias} días
                  </span>
                </div>
              </label>
            ))}
          </div>
          {errors.plan_tipo_id && <p className={errorClass}>{errors.plan_tipo_id}</p>}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      {/* Estado */}
      <div>
        <label className={labelClass}>Estado</label>
        <div className="flex gap-4">
          {(['activa', 'pendiente'] as const).map((v) => (
            <label key={v} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="estado"
                value={v}
                checked={estado === v}
                onChange={() => setEstado(v)}
                disabled={isSubmitting}
                className="accent-turquoise"
              />
              <span className="text-sm text-slate-200 capitalize">{v}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dates (required when activa) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Fecha inicio {estado === 'activa' ? '*' : ''}</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
          {errors.fecha_inicio && <p className={errorClass}>{errors.fecha_inicio}</p>}
        </div>
        <div>
          <label className={labelClass}>Fecha fin {estado === 'activa' ? '*' : ''}</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            disabled={isSubmitting}
            className={inputClass}
          />
          {errors.fecha_fin && <p className={errorClass}>{errors.fecha_fin}</p>}
        </div>
      </div>

      {/* Comentarios */}
      <div>
        <label className={labelClass}>Comentarios</label>
        <textarea
          rows={2}
          value={comentarios}
          onChange={(e) => setComentarios(e.target.value)}
          disabled={isSubmitting}
          className={`${inputClass} resize-none`}
          placeholder="Opcional…"
        />
      </div>

      {/* Payment section */}
      <div className="rounded-lg border border-portal-border p-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={crearPago}
            onChange={(e) => setCrearPago(e.target.checked)}
            disabled={isSubmitting}
            className="accent-turquoise"
          />
          <span className="text-sm font-medium text-slate-200">Registrar pago</span>
        </label>

        {crearPago && (
          <div className="mt-3 space-y-3">
            <div>
              <label className={labelClass}>Monto *</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                disabled={isSubmitting}
                className={inputClass}
                placeholder="0.00"
              />
              {errors.monto && <p className={errorClass}>{errors.monto}</p>}
            </div>
            <div>
              <label className={labelClass}>Método de pago *</label>
              <select
                value={metodoPagoId}
                onChange={(e) => setMetodoPagoId(e.target.value)}
                disabled={loadingMetodosPago || isSubmitting}
                className={inputClass}
              >
                {loadingMetodosPago ? (
                  <option value="">Cargando…</option>
                ) : (
                  <>
                    <option value="">Seleccionar</option>
                    {metodosPago.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {errors.metodo_pago_id && <p className={errorClass}>{errors.metodo_pago_id}</p>}
            </div>
            <div>
              <label className={labelClass}>Estado del pago</label>
              <div className="flex gap-4">
                {(['validado', 'pendiente'] as const).map((v) => (
                  <label key={v} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="estado_pago"
                      value={v}
                      checked={estadoPago === v}
                      onChange={() => setEstadoPago(v)}
                      disabled={isSubmitting}
                      className="accent-turquoise"
                    />
                    <span className="text-sm text-slate-200 capitalize">{v}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* General error */}
      {errors.general && (
        <div className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
          {errors.general}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => {
        if (!isSubmitting) {
          reset();
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Crear Suscripción"
        tabIndex={-1}
        className="glass mx-4 w-full max-w-lg rounded-xl border border-portal-border p-6 shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Nueva Suscripción</h2>
            <p className="mt-0.5 text-xs text-slate-400">Paso {step} de 3</p>
          </div>
          <button
            onClick={() => {
              if (!isSubmitting) {
                reset();
                onClose();
              }
            }}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200 disabled:opacity-50"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator bar */}
        <div className="mt-4 flex gap-1">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-turquoise' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="mt-5">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                onClick={goBack}
                disabled={isSubmitting}
                className={cancelBtnClass}
              >
                Anterior
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (!isSubmitting) {
                  reset();
                  onClose();
                }
              }}
              disabled={isSubmitting}
              className={cancelBtnClass}
            >
              Cancelar
            </button>
            {step < 3 ? (
              <button onClick={goNext} disabled={isSubmitting} className={primaryBtnClass}>
                Siguiente
              </button>
            ) : (
              <button
                onClick={async () => {
                  await submit();
                }}
                disabled={isSubmitting}
                className={primaryBtnClass}
              >
                {isSubmitting ? 'Creando…' : 'Crear suscripción'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
