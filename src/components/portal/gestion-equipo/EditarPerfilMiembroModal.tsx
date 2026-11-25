'use client';

import { useCallback, useEffect, useState } from 'react';
import { equipoService } from '@/services/supabase/portal/equipo.service';
import type {
  EditarPerfilMiembroInput,
  MiembroTableItem,
  TipoIdentificacion,
} from '@/types/portal/equipo.types';

type EditarPerfilMiembroModalProps = {
  miembro: MiembroTableItem | null;
  onClose: () => void;
  onSave: (input: EditarPerfilMiembroInput) => Promise<void>;
};

const TIPO_ID_OPTIONS: TipoIdentificacion[] = ['CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'];

export function EditarPerfilMiembroModal({ miembro, onClose, onSave }: EditarPerfilMiembroModalProps) {
  /* ── Form state ── */
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
  const [fechaExpIdentificacion, setFechaExpIdentificacion] = useState('');
  const [rh, setRh] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [alturaCm, setAlturaCm] = useState('');

  const [loadingPerfil, setLoadingPerfil] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [nombreError, setNombreError] = useState(false);

  /* ── Pre-fill on open ── */
  useEffect(() => {
    if (!miembro) return;
    setNombre(miembro.nombre ?? '');
    setApellido(miembro.apellido ?? '');
    setTelefono(miembro.telefono ?? '');
    setFechaNacimiento(miembro.fecha_nacimiento ?? '');
    setTipoIdentificacion(miembro.tipo_identificacion ?? '');
    setNumeroIdentificacion(miembro.numero_identificacion ?? '');
    setFechaExpIdentificacion(miembro.fecha_exp_identificacion ?? '');
    setRh(miembro.rh ?? '');
    setErrorMsg(null);
    setNombreError(false);

    // Lazy-fetch sports profile
    setLoadingPerfil(true);
    equipoService
      .getPerfilDeportivo(miembro.usuario_id)
      .then((p) => {
        setPesoKg(p.peso_kg != null ? String(p.peso_kg) : '');
        setAlturaCm(p.altura_cm != null ? String(p.altura_cm) : '');
      })
      .catch(() => {
        setPesoKg('');
        setAlturaCm('');
      })
      .finally(() => setLoadingPerfil(false));
  }, [miembro]);

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    if (!miembro) return;
    const trimmedNombre = nombre.trim();
    if (!trimmedNombre) {
      setNombreError(true);
      return;
    }
    setNombreError(false);
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSave({
        usuario_id: miembro.usuario_id,
        nombre: trimmedNombre,
        apellido: apellido.trim() || null,
        telefono: telefono.trim() || null,
        fecha_nacimiento: fechaNacimiento || null,
        tipo_identificacion: (tipoIdentificacion as TipoIdentificacion) || null,
        numero_identificacion: numeroIdentificacion.trim() || null,
        fecha_exp_identificacion: fechaExpIdentificacion || null,
        rh: rh.trim() || null,
        peso_kg: pesoKg ? Number(pesoKg) : null,
        altura_cm: alturaCm ? Number(alturaCm) : null,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  }, [miembro, nombre, apellido, telefono, fechaNacimiento, tipoIdentificacion, numeroIdentificacion, fechaExpIdentificacion, rh, pesoKg, alturaCm, onSave, onClose]);

  if (!miembro) return null;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-grit-bg border-l border-grit-glass-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-grit-glass-border px-6 py-4">
          <h2 className="font-grit-title text-lg font-semibold text-grit-text">Editar perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-grit-subtext hover:text-grit-text transition"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-grit-subtext">Identidad</legend>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setNombreError(false); }}
                className={`w-full rounded-grit-md border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50 ${nombreError ? 'border-grit-danger/40' : 'border-grit-glass-border'}`}
              />
              {nombreError ? <p className="mt-1 text-xs text-grit-danger">El nombre es obligatorio</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Correo electrónico</label>
              <input
                type="email"
                value={miembro.email}
                disabled
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-muted cursor-not-allowed"
              />
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-grit-subtext">Contacto</legend>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Fecha de nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
              />
            </div>
          </fieldset>

          {/* Document */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-grit-subtext">Documento</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-grit-subtext">Tipo identificación</label>
                <select
                  value={tipoIdentificacion}
                  onChange={(e) => setTipoIdentificacion(e.target.value)}
                  className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
                >
                  <option value="">—</option>
                  {TIPO_ID_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-grit-subtext">N° Identificación</label>
                <input
                  type="text"
                  value={numeroIdentificacion}
                  onChange={(e) => setNumeroIdentificacion(e.target.value)}
                  className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">Fecha expedición ID</label>
              <input
                type="date"
                value={fechaExpIdentificacion}
                onChange={(e) => setFechaExpIdentificacion(e.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-grit-subtext">RH</label>
              <input
                type="text"
                value={rh}
                onChange={(e) => setRh(e.target.value)}
                className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
              />
            </div>
          </fieldset>

          {/* Sports profile */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-grit-subtext">Perfil deportivo</legend>
            {loadingPerfil ? (
              <div className="h-16 animate-pulse rounded-grit-md bg-white/5" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-grit-subtext">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-grit-subtext">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alturaCm}
                    onChange={(e) => setAlturaCm(e.target.value)}
                    className="w-full rounded-grit-md border border-grit-glass-border bg-grit-card px-3 py-2 text-sm text-grit-text outline-none transition focus:border-grit-cyan/50"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Error */}
          {errorMsg ? (
            <p className="rounded-grit-md border border-grit-danger/25 bg-grit-danger/10 px-4 py-2 text-xs text-grit-danger">
              {errorMsg}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border px-4 py-2 text-sm font-semibold text-grit-subtext transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
