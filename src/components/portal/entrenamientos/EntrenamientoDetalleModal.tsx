'use client';

import { useEffect, useState } from 'react';
import { MultilineText } from '@/components/ui';
import type { ViewTarget } from '@/hooks/portal/entrenamientos/useEntrenamientos';
import { VisibilidadBadge } from './EntrenamientosList';
import { GuardarPlantillaModal } from './GuardarPlantillaModal';
import { FormularioPreviewModal } from '@/components/portal/formularios/FormularioPreviewModal';
import { formulariosService } from '@/services/supabase/portal/formularios.service';
import type { FormularioSeccion } from '@/types/portal/formularios.types';

type EntrenamientoDetalleModalProps = {
  open: boolean;
  tenantId: string;
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
  tenantId,
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
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Detalle del entrenamiento"
        className="absolute inset-y-0 right-0 flex w-full max-w-3xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">Detalle del entrenamiento</h2>
            <p className="mt-1 text-xs text-grit-subtext">Información completa de solo lectura.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {/* Basic info */}
          <section className="space-y-3 rounded-grit-lg border border-grit-glass-border bg-grit-bg/45 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-grit-title text-sm font-semibold text-grit-text">{instance.nombre}</h3>
              <VisibilidadBadge visibilidad={instance.visibilidad} />
            </div>

            {instance.descripcion ? (
              <MultilineText className="text-sm text-grit-subtext">{instance.descripcion}</MultilineText>
            ) : null}

            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-grit-subtext">Disciplina</dt>
                <dd className="text-sm text-grit-text">{disciplineNameById[instance.disciplina_id] ?? 'Sin disciplina'}</dd>
              </div>
              <div>
                <dt className="text-xs text-grit-subtext">Escenario</dt>
                <dd className="text-sm text-grit-text">{scenarioNameById[instance.escenario_id] ?? 'Sin escenario'}</dd>
              </div>
              <div>
                <dt className="text-xs text-grit-subtext">Entrenador</dt>
                <dd className="text-sm text-grit-text">
                  {instance.entrenador_id ? entrenadorNameById[instance.entrenador_id] ?? 'Sin asignar' : 'Sin asignar'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-grit-subtext">Duración</dt>
                <dd className="text-sm text-grit-text">
                  {instance.duracion_minutos ? `${instance.duracion_minutos} min` : 'Sin definir'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-grit-subtext">Cupo máximo</dt>
                <dd className="text-sm text-grit-text">{instance.cupo_maximo ?? 'Sin límite'}</dd>
              </div>
              {instance.punto_encuentro ? (
                <div>
                  <dt className="text-xs text-grit-subtext">Punto de encuentro</dt>
                  <dd className="text-sm text-grit-text">{instance.punto_encuentro}</dd>
                </div>
              ) : null}
              {instance.formulario_externo ? (
                <div>
                  <dt className="text-xs text-grit-subtext">
                    Formulario externo{instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                  </dt>
                  <dd className="text-sm">
                    <a
                      href={instance.formulario_externo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-grit-cyan hover:underline"
                    >
                      {instance.formulario_externo}
                    </a>
                  </dd>
                </div>
              ) : null}
              {instance.formulario_id ? (
                <div>
                  <dt className="text-xs text-grit-subtext">
                    Formulario{instance.formulario_obligatorio ? ' · Obligatorio' : ''}
                  </dt>
                  <dd className="text-sm text-grit-text">
                    <span>{instance.formulario_plantilla?.nombre ?? 'Plantilla de formulario'}</span>{' '}
                    <button
                      type="button"
                      onClick={handleOpenPreview}
                      className="text-grit-cyan hover:underline"
                    >
                      Ver formulario
                    </button>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {/* Horario / Recurrencia */}
          <section className="space-y-2 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
            <h3 className="font-grit-title text-sm font-semibold text-grit-text">Horario y recurrencia</h3>

            {instance.entrenamiento_grupo_id ? (
              relatedGroup ? (
                <div className="space-y-3 text-sm text-grit-text">
                  <p>
                    <span className="text-grit-subtext">Tipo de serie:</span>{' '}
                    {relatedGroup.tipo === 'recurrente' ? 'Recurrente' : 'Único'}
                  </p>
                  <p>
                    <span className="text-grit-subtext">Vigencia:</span> {formatDateOnlyLabel(relatedGroup.fecha_inicio)} –{' '}
                    {relatedGroup.fecha_fin ? formatDateOnlyLabel(relatedGroup.fecha_fin) : 'Sin fecha de fin'}
                  </p>

                  {relatedGroup.reglas.map((rule, index) => (
                    <div key={rule.id} className="rounded-grit-2xl border border-grit-glass-border bg-grit-card p-3">
                      <p className="text-xs text-grit-subtext">Bloque horario {index + 1}</p>
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
                    <span className="text-grit-subtext">Esta instancia:</span> {formatDateTimeLabel(instance.fecha_hora)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-grit-subtext">No se encontró información de la serie asociada.</p>
              )
            ) : (
              <p className="text-sm text-grit-text">{formatDateTimeLabel(instance.fecha_hora)}</p>
            )}
          </section>

          {/* Categorías por nivel */}
          <section className="space-y-2 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
            <h3 className="font-grit-title text-sm font-semibold text-grit-text">Categorías por nivel</h3>
            {viewLoading ? (
              <p className="text-sm text-grit-subtext">Cargando categorías...</p>
            ) : categorias.length > 0 ? (
              <ul className="space-y-1">
                {categorias.map((categoria) => (
                  <li key={categoria.id} className="flex items-center justify-between text-sm text-grit-text">
                    <span>{nivelNameById[categoria.nivel_id] ?? 'Nivel no disponible'}</span>
                    <span className="text-grit-subtext">{categoria.cupos_asignados} cupos</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-grit-subtext">Sin configuración de categorías.</p>
            )}
          </section>

          {/* Restricciones de reserva */}
          <section className="space-y-2 rounded-grit-2xl border border-grit-glass-border bg-grit-bg/45 p-4">
            <h3 className="font-grit-title text-sm font-semibold text-grit-text">Restricciones de reserva</h3>
            {viewLoading ? (
              <p className="text-sm text-grit-subtext">Cargando restricciones...</p>
            ) : hasRestricciones ? (
              <div className="space-y-3">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-grit-subtext">Antelación mínima para reservar</dt>
                    <dd className="text-sm text-grit-text">
                      {instance.reserva_antelacion_horas != null ? `${instance.reserva_antelacion_horas} horas` : 'Sin restricción'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-grit-subtext">Antelación mínima para cancelar</dt>
                    <dd className="text-sm text-grit-text">
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
                        <div key={restriccion.id} className="rounded-grit-md border border-grit-glass-border bg-grit-card p-3 text-sm text-grit-text">
                          {restriccion.descripcion ? (
                            <MultilineText className="text-xs text-grit-subtext">{restriccion.descripcion}</MultilineText>
                          ) : null}
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
              <p className="text-sm text-grit-subtext">Sin restricciones configuradas.</p>
            )}
          </section>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          {canManage ? (
            <button
              type="button"
              aria-label="Guardar configuración como plantilla"
              onClick={onOpenGuardarPlantillaModal}
              disabled={viewLoading}
              className="inline-flex items-center gap-2 rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text transition hover:border-grit-cyan/70 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text"
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
        tenantId={tenantId}
        plantillaNombre={instance.formulario_plantilla?.nombre ?? 'Formulario'}
        secciones={previewSecciones}
        loading={previewLoading}
        error={previewError}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
