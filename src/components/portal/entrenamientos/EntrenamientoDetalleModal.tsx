'use client';

import { useEffect, useState } from 'react';
import type { ViewTarget } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { VisibilidadBadge } from './EntrenamientosList';
import { GuardarPlantillaModal } from './GuardarPlantillaModal';
import { FormularioPreviewModal } from '@/components/portal/formularios/FormularioPreviewModal';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import type { FormularioSeccion } from '@/types/portal/formularios.types';

type EntrenamientoDetalleModalProps = {
  open: boolean;
  viewTarget: ViewTarget | null;
  viewLoading: boolean;
  canManage: boolean;
  disciplineNameById: Record<string, string>;
  scenarioNameById: Record<string, string>;
  entrenadorNameById: Record<string, string>;
  servicioNameById: Record<string, string>;
  onClose: () => void;
  isGuardarPlantillaModalOpen: boolean;
  isSavingPlantilla: boolean;
  guardarPlantillaError: string | null;
  onOpenGuardarPlantillaModal: () => void;
  onCloseGuardarPlantillaModal: () => void;
  onGuardarPlantilla: (nombre: string, descripcion: string | null) => Promise<boolean>;
};

const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

const SERVICE_SLOTS = [
  { key: 'servicio_1_id', label: 'Servicio 1' },
  { key: 'servicio_2_id', label: 'Servicio 2' },
  { key: 'servicio_3_id', label: 'Servicio 3' },
  { key: 'servicio_4_id', label: 'Servicio 4' },
] as const;

function formatDateTimeLabel(value: string | null): string {
  if (!value) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDateOnlyLabel(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function usuarioEstadoLabel(value: string | null): string {
  return value === 'activo' ? 'Activo' : '— Sin requisito —';
}

export function EntrenamientoDetalleModal({
  open,
  viewTarget,
  viewLoading,
  canManage,
  disciplineNameById,
  scenarioNameById,
  entrenadorNameById,
  servicioNameById,
  onClose,
  isGuardarPlantillaModalOpen,
  isSavingPlantilla,
  guardarPlantillaError,
  onOpenGuardarPlantillaModal,
  onCloseGuardarPlantillaModal,
  onGuardarPlantilla,
}: EntrenamientoDetalleModalProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewSecciones, setPreviewSecciones] = useState<FormularioSeccion[]>([]);

  useEffect(() => {
    if (!open) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, open]);

  if (!open || !viewTarget) {
    return null;
  }

  const { instance, relatedGroup, categorias, restricciones, niveles } = viewTarget;

  const nivelNameById = niveles.reduce<Record<string, string>>((accumulator, nivel) => {
    accumulator[nivel.id] = nivel.nombre;
    return accumulator;
  }, {});

  const hasRestricciones =
    restricciones.length > 0 || instance.reserva_antelacion_horas != null || instance.cancelacion_antelacion_horas != null;

  const handleOpenPreview = () => {
    if (!instance.formulario_id) return;
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    formulariosService
      .getPlantillaConSecciones(instance.formulario_id)
      .then((plantilla) => setPreviewSecciones(plantilla.secciones))
      .catch(() => setPreviewError('No fue posible cargar el formulario.'))
      .finally(() => setPreviewLoading(false));
  };

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar detalle del entrenamiento"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del entrenamiento"
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Detalle del entrenamiento</h2>
            <p className="mt-1 text-xs text-slate-400">Información completa de solo lectura.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* Basic info */}
          <section className="space-y-3 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">{instance.nombre}</h3>
              <VisibilidadBadge visibilidad={instance.visibilidad} />
            </div>

            {instance.descripcion ? <p className="text-sm text-slate-300">{instance.descripcion}</p> : null}

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-400">Disciplina</dt>
                <dd className="text-sm text-slate-200">{disciplineNameById[instance.disciplina_id] ?? 'Sin disciplina'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Escenario</dt>
                <dd className="text-sm text-slate-200">{scenarioNameById[instance.escenario_id] ?? 'Sin escenario'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Entrenador</dt>
                <dd className="text-sm text-slate-200">
                  {instance.entrenador_id ? entrenadorNameById[instance.entrenador_id] ?? 'Sin asignar' : 'Sin asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Duración</dt>
                <dd className="text-sm text-slate-200">
                  {instance.duracion_minutos ? `${instance.duracion_minutos} min` : 'Sin definir'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-400">Cupo máximo</dt>
                <dd className="text-sm text-slate-200">{instance.cupo_maximo ?? 'Sin límite'}</dd>
              </div>
              {instance.punto_encuentro ? (
                <div>
                  <dt className="text-xs text-slate-400">Punto de encuentro</dt>
                  <dd className="text-sm text-slate-200">{instance.punto_encuentro}</dd>
                </div>
              ) : null}
              {instance.formulario_externo ? (
                <div>
                  <dt className="text-xs text-slate-400">
                    Formulario externo{instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                  </dt>
                  <dd className="text-sm">
                    <a
                      href={instance.formulario_externo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-turquoise hover:underline"
                    >
                      {instance.formulario_externo}
                    </a>
                  </dd>
                </div>
              ) : null}
              {instance.formulario_id ? (
                <div>
                  <dt className="text-xs text-slate-400">
                    Formulario{instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                  </dt>
                  <dd className="text-sm text-slate-200">
                    <span>{instance.formulario_plantilla?.nombre ?? 'Plantilla de formulario'}</span>{' '}
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      className="text-turquoise hover:underline"
                    >
                      Ver formulario
                    </button>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Horario / Recurrencia */}
          <section className="space-y-2 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Horario y recurrencia</h3>

            {instance.entrenamiento_grupo_id ? (
              relatedGroup ? (
                <div className="space-y-3 text-sm text-slate-200">
                  <p>
                    <span className="text-slate-400">Tipo de serie:</span>{' '}
                    {relatedGroup.tipo === 'recurrente' ? 'Recurrente' : 'Único'}
                  </p>
                  <p>
                    <span className="text-slate-400">Vigencia:</span> {formatDateOnlyLabel(relatedGroup.fecha_inicio)} –{' '}
                    {relatedGroup.fecha_fin ? formatDateOnlyLabel(relatedGroup.fecha_fin) : 'Sin fecha de fin'}
                  </p>

                  {relatedGroup.reglas.map((rule, index) => (
                    <div key={rule.id} className="rounded-lg border border-slate-700/60 bg-navy-medium/20 p-3">
                      <p className="text-xs text-slate-400">Bloque horario {index + 1}</p>
                      <p>Días: {rule.dias_semana.map((day) => WEEKDAY_LABELS[day] ?? day).join(', ')}</p>
                      <p>Repite cada {rule.repetir_cada_semanas} semana(s)</p>
                      {rule.tipo_bloque === 'una_vez_dia' ? <p>Hora: {rule.hora_inicio}</p> : null}
                      {rule.tipo_bloque === 'franja_repeticion' ? (
                        <p>Franja: {rule.hora_inicio} – {rule.hora_fin}</p>
                      ) : null}
                      {rule.tipo_bloque === 'horas_especificas' ? <p>Horas: {(rule.horas_especificas ?? []).join(', ')}</p> : null}
                    </div>
                  ))}

                  <p>
                    <span className="text-slate-400">Esta instancia:</span> {formatDateTimeLabel(instance.fecha_hora)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No se encontró información de la serie asociada.</p>
              )
            ) : (
              <p className="text-sm text-slate-200">{formatDateTimeLabel(instance.fecha_hora)}</p>
            )}
          </section>

          {/* Categorías por nivel */}
          <section className="space-y-2 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Categorías por nivel</h3>
            {viewLoading ? (
              <p className="text-sm text-slate-400">Cargando categorías...</p>
            ) : categorias.length > 0 ? (
              <ul className="space-y-1">
                {categorias.map((categoria) => (
                  <li key={categoria.id} className="flex items-center justify-between text-sm text-slate-200">
                    <span>{nivelNameById[categoria.nivel_id] ?? 'Nivel no disponible'}</span>
                    <span className="text-slate-400">{categoria.cupos_asignados} cupos</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Sin configuración de categorías.</p>
            )}
          </section>

          {/* Restricciones de reserva */}
          <section className="space-y-2 rounded-xl border border-portal-border bg-navy-deep/45 p-4">
            <h3 className="text-sm font-semibold text-slate-100">Restricciones de reserva</h3>
            {viewLoading ? (
              <p className="text-sm text-slate-400">Cargando restricciones...</p>
            ) : hasRestricciones ? (
              <div className="space-y-3">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-400">Antelación mínima para reservar</dt>
                    <dd className="text-sm text-slate-200">
                      {instance.reserva_antelacion_horas != null ? `${instance.reserva_antelacion_horas} horas` : 'Sin restricción'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Antelación mínima para cancelar</dt>
                    <dd className="text-sm text-slate-200">
                      {instance.cancelacion_antelacion_horas != null
                        ? `${instance.cancelacion_antelacion_horas} horas`
                        : 'Sin restricción'}
                    </dd>
                  </div>
                </dl>

                {restricciones.length > 0 ? (
                  <div className="space-y-2">
                    {restricciones.map((restriccion) => {
                      const requiredServices = SERVICE_SLOTS.map((slot) => restriccion[slot.key])
                        .filter((id): id is string => Boolean(id))
                        .map((id) => servicioNameById[id] ?? 'Servicio no disponible');

                      return (
                        <div key={restriccion.id} className="rounded-lg border border-slate-700/60 bg-navy-medium/20 p-3 text-sm text-slate-200">
                          {restriccion.descripcion ? <p className="text-xs text-slate-400">{restriccion.descripcion}</p> : null}
                          <p>Estado usuario: {usuarioEstadoLabel(restriccion.usuario_estado)}</p>
                          <p>Validar nivel: {restriccion.validar_nivel_disciplina ? 'Sí' : 'No'}</p>
                          <p>Servicios requeridos: {requiredServices.length > 0 ? requiredServices.join(', ') : 'Ninguno'}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Sin restricciones configuradas.</p>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          {canManage ? (
            <button
              type="button"
              aria-label="Guardar configuración como plantilla"
              onClick={onOpenGuardarPlantillaModal}
              disabled={viewLoading}
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
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200"
          >
            Cerrar
          </button>
        </footer>
      </aside>

      <GuardarPlantillaModal
        open={isGuardarPlantillaModalOpen}
        isSaving={isSavingPlantilla}
        error={guardarPlantillaError}
        onClose={onCloseGuardarPlantillaModal}
        onSave={onGuardarPlantilla}
      />

      <FormularioPreviewModal
        open={previewOpen}
        plantillaNombre={instance.formulario_plantilla?.nombre ?? 'Formulario'}
        secciones={previewSecciones}
        loading={previewLoading}
        error={previewError}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
