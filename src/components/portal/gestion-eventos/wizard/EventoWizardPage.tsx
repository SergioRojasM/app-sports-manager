'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GritButton, GritEmptyState, GritPageHeader, GritTag } from '@/components/ui';
import { useEventoWizard } from '@/hooks/portal/gestion-eventos/useEventoWizard';
import { useEventoWizardOptions } from '@/hooks/portal/gestion-eventos/useEventoWizardOptions';
import { EventoConfiguracionStep } from './EventoConfiguracionStep';
import { EventoEntradasStep } from './EventoEntradasStep';
import { EventoMetodosPagoStep } from './EventoMetodosPagoStep';
import { EventoWizardFooter } from './EventoWizardFooter';
import { EventoWizardStepper } from './EventoWizardStepper';
import { SalirSinGuardarModal } from './SalirSinGuardarModal';
import { fieldDomId } from './fields';
import { EVENTO_WIZARD_STEPS, type EventoWizardStep } from '@/types/portal/eventos.types';

type EventoWizardPageProps = {
  tenantId: string;
  /** Present in edit mode. */
  eventoId?: string;
};

const RELATIVE_TICK_MS = 30_000;

function formatUltimoGuardado(iso: string, now: number): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'Último guardado: hace un momento';
  if (minutes < 60) return `Último guardado: hace ${minutes} min`;
  return `Último guardado: ${new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))}`;
}

/** Full-page create/edit wizard for team events (US-0119). */
export function EventoWizardPage({ tenantId, eventoId }: EventoWizardPageProps) {
  const router = useRouter();
  const options = useEventoWizardOptions(tenantId);
  const eventosExistentesIds = useMemo(
    () => (options.loading ? null : new Set(options.eventos.map((evento) => evento.id))),
    [options.eventos, options.loading],
  );
  const wizard = useEventoWizard({
    tenantId,
    eventoId,
    formulariosActivosIds: options.formulariosActivosIds,
    eventosExistentesIds,
  });

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef<EventoWizardStep>(wizard.step);
  const lastFocusNonce = useRef<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), RELATIVE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Focus the first invalid field once it has rendered (possibly on another step)
  useEffect(() => {
    const request = wizard.focusRequest;
    if (!request || lastFocusNonce.current === request.nonce) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(fieldDomId(request.key));
      if (element) {
        lastFocusNonce.current = request.nonce;
        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        element.focus({ preventScroll: true });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [wizard.focusRequest, wizard.step]);

  // On a plain step change, move focus to the step heading
  useEffect(() => {
    if (previousStep.current === wizard.step) return;
    previousStep.current = wizard.step;
    const pendingFieldFocus = wizard.focusRequest && lastFocusNonce.current !== wizard.focusRequest.nonce;
    if (!pendingFieldFocus) stepHeadingRef.current?.focus();
  }, [wizard.focusRequest, wizard.step]);

  const listPath = wizard.basePath;
  const requestLeave = () => {
    if (wizard.isDirty) setConfirmLeave(true);
    else router.push(listPath);
  };

  const title = wizard.esNuevo ? 'Nuevo evento' : 'Editar evento';

  if (wizard.loading) {
    return (
      <section className="space-y-6" aria-busy="true">
        <GritPageHeader title={title} />
        <div className="h-20 animate-pulse rounded-grit-2xl bg-grit-card" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-grit-2xl bg-grit-card" />
          <div className="h-96 animate-pulse rounded-grit-2xl bg-grit-card" />
        </div>
      </section>
    );
  }

  if (wizard.notFound) {
    return (
      <GritEmptyState
        icon="event_busy"
        title="Evento no encontrado"
        titleAs="h1"
        description="El evento no existe o no pertenece a esta organización."
        action={
          <GritButton variant="secondary" size="sm" icon="arrow_back" href={listPath}>
            Volver a eventos
          </GritButton>
        }
      />
    );
  }

  if (wizard.loadError || options.error) {
    return (
      <GritEmptyState
        icon="error"
        title="No se pudo cargar el evento"
        titleAs="h1"
        description={wizard.loadError ?? options.error}
        descriptionClassName="text-grit-danger"
        action={
          <GritButton
            variant="secondary"
            size="sm"
            icon="refresh"
            onClick={() => {
              if (wizard.loadError) void wizard.reload();
              if (options.error) void options.reload();
            }}
          >
            Reintentar
          </GritButton>
        }
      />
    );
  }

  const publicado = !wizard.esNuevo && !wizard.esBorrador;
  const disabled = wizard.isSaving || options.loading;
  const currentStepMeta = EVENTO_WIZARD_STEPS.find((item) => item.step === wizard.step) ?? EVENTO_WIZARD_STEPS[0];

  return (
    <section className="space-y-6">
      <GritPageHeader
        title={title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {!wizard.esNuevo && wizard.draft.nombre.trim() && <span>{wizard.draft.nombre}</span>}
            {wizard.esBorrador && (
              <GritTag tone="neutral" icon="edit_note">
                Borrador
              </GritTag>
            )}
            {wizard.ultimoGuardado && (
              <span className="text-xs text-grit-muted">{formatUltimoGuardado(wizard.ultimoGuardado, now)}</span>
            )}
          </span>
        }
        actions={
          <GritButton variant="ghost" size="sm" icon="arrow_back" onClick={requestLeave} disabled={wizard.isSaving}>
            Volver a eventos
          </GritButton>
        }
      />

      <EventoWizardStepper
        current={wizard.step}
        stepsWithErrors={wizard.stepsWithErrors}
        onGoTo={(step) => wizard.goTo(step)}
        disabled={wizard.isSaving}
      />

      <h2 ref={stepHeadingRef} tabIndex={-1} className="font-grit-title text-xl font-semibold text-grit-text outline-none">
        {currentStepMeta.label}
      </h2>

      {wizard.step === 1 && <EventoConfiguracionStep wizard={wizard} options={options} disabled={disabled} />}
      {wizard.step === 2 && <EventoEntradasStep wizard={wizard} options={options} disabled={disabled} />}
      {wizard.step === 3 && <EventoMetodosPagoStep wizard={wizard} options={options} disabled={disabled} />}

      <EventoWizardFooter
        step={wizard.step}
        publicado={publicado}
        mostrarGuardarBorrador={wizard.mostrarGuardarBorrador}
        canGuardarBorrador={wizard.canGuardarBorrador && !options.loading}
        nombreVacio={wizard.draft.nombre.trim().length === 0}
        isDirty={wizard.isDirty}
        savingKind={wizard.savingKind}
        borradorGuardadoFlash={wizard.borradorGuardadoFlash}
        saveError={wizard.saveError}
        disabled={options.loading}
        onBack={() => wizard.goTo((wizard.step - 1) as EventoWizardStep)}
        onNext={() => wizard.goTo((wizard.step + 1) as EventoWizardStep)}
        onGuardarBorrador={() => void wizard.guardarBorrador()}
        onGuardarFinal={() => void wizard.guardarFinal()}
      />

      {confirmLeave && (
        <SalirSinGuardarModal onStay={() => setConfirmLeave(false)} onLeave={() => router.push(listPath)} />
      )}
    </section>
  );
}
