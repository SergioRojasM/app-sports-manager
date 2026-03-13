'use client';

import { useCallback, useEffect, useState } from 'react';
import { equipoService } from '@/services/supabase/portal/equipo.service';
import type {
  EditarPerfilMiembroInput,
  MiembroEstado,
  MiembroTableItem,
  TipoIdentificacion,
} from '@/types/portal/equipo.types';

type EditarPerfilMiembroModalProps = {
  miembro: MiembroTableItem | null;
  onClose: () => void;
  onSave: (input: EditarPerfilMiembroInput) => Promise<void>;
};

const ESTADO_OPTIONS: MiembroEstado[] = ['activo', 'mora', 'suspendido', 'inactivo'];
const TIPO_ID_OPTIONS: TipoIdentificacion[] = ['CC', 'CE', 'TI', 'NIT', 'Pasaporte', 'Otro'];

export function EditarPerfilMiembroModal({ miembro, onClose, onSave }: EditarPerfilMiembroModalProps) {
  /* ── Form state ── */
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [tipoIdentificacion, setTipoIdentificacion] = useState('');
  const [numeroIdentificacion, setNumeroIdentificacion] = useState('');
  const [rh, setRh] = useState('');
  const [estado, setEstado] = useState<MiembroEstado>('activo');
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
    setFechaNacimiento('');
    setTipoIdentificacion(miembro.tipo_identificacion ?? '');
    setNumeroIdentificacion(miembro.numero_identificacion ?? '');
    setRh(miembro.rh ?? '');
    setEstado(miembro.estado);
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
        rh: rh.trim() || null,
        estado,
        peso_kg: pesoKg ? Number(pesoKg) : null,
        altura_cm: alturaCm ? Number(alturaCm) : null,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  }, [miembro, nombre, apellido, telefono, fechaNacimiento, tipoIdentificacion, numeroIdentificacion, rh, estado, pesoKg, alturaCm, onSave, onClose]);

  if (!miembro) return null;

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto bg-navy-deep border-l border-portal-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-portal-border px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-100">Editar perfil</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Identity */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Identidad</legend>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => { setNombre(e.target.value); setNombreError(false); }}
                className={`w-full rounded-lg border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50 ${nombreError ? 'border-rose-400' : 'border-portal-border'}`}
              />
              {nombreError ? <p className="mt-1 text-xs text-rose-400">El nombre es obligatorio</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Apellido</label>
              <input
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Correo electrónico</label>
              <input
                type="email"
                value={miembro.email}
                disabled
                className="w-full rounded-lg border border-portal-border bg-navy-medium/50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Contacto</legend>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Fecha de nacimiento</label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
              />
            </div>
          </fieldset>

          {/* Document */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Documento</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Tipo identificación</label>
                <select
                  value={tipoIdentificacion}
                  onChange={(e) => setTipoIdentificacion(e.target.value)}
                  className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
                >
                  <option value="">—</option>
                  {TIPO_ID_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">N° Identificación</label>
                <input
                  type="text"
                  value={numeroIdentificacion}
                  onChange={(e) => setNumeroIdentificacion(e.target.value)}
                  className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">RH</label>
              <input
                type="text"
                value={rh}
                onChange={(e) => setRh(e.target.value)}
                className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
              />
            </div>
          </fieldset>

          {/* Status */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estado</legend>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as MiembroEstado)}
              className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
            >
              {ESTADO_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </fieldset>

          {/* Sports profile */}
          <fieldset className="space-y-3">
            <legend className="text-xs font-semibold uppercase tracking-wider text-slate-400">Perfil deportivo</legend>
            {loadingPerfil ? (
              <div className="h-16 animate-pulse rounded-lg bg-white/5" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Peso (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Altura (cm)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={alturaCm}
                    onChange={(e) => setAlturaCm(e.target.value)}
                    className="w-full rounded-lg border border-portal-border bg-navy-medium px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-turquoise/50"
                  />
                </div>
              </div>
            )}
          </fieldset>

          {/* Error */}
          {errorMsg ? (
            <p className="rounded-lg border border-rose-400/25 bg-rose-900/20 px-4 py-2 text-xs text-rose-200">
              {errorMsg}
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-portal-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-portal-border px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
