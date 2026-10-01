'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/services/supabase/client';
import { eventosService } from '@/services/supabase/portal/eventos.service';
import { storageService } from '@/services/supabase/portal/storage.service';
import {
  EVENTO_BANNER_MAX_BYTES,
  EVENTO_BANNER_MIME_TYPES,
  draftFromEventoCompleto,
  draftFromEventoDuplicado,
  draftToPayload,
  shiftWithEventoFecha,
  emptyCuponDraft,
  emptyEntradaDraft,
  emptyEventoDraft,
  serializeDraft,
  stepOfErrorKey,
  validateEventoDraft,
  type EventoValidationMode,
} from '@/lib/portal/eventos-wizard.utils';
import {
  EventoServiceError,
  type EventoCuponDraft,
  type EventoDraft,
  type EventoDuplicadoAjustes,
  type EventoEntradaDraft,
  type EventoEntrenadorSnapshot,
  type EventoMetodoPagoSnapshot,
  type EventoWizardErrors,
  type EventoWizardStep,
} from '@/types/portal/eventos.types';
import type { CronogramaItem, IncluyeItem } from '@/types/portal/eventos.types';
import { useTenantName } from '@/hooks/portal/tenant/useTenantName';

type SavedState = {
  draft: EventoDraft;
  ultimoGuardado: string;
};

/**
 * Hands the just-saved draft from the `/nuevo` mount to the `/{id}/editar` mount after the
 * first draft save, so the edit page hydrates without refetching or flashing a loader (US-0119, D6).
 * Memory-only: a hard reload always reads from the database.
 */
const draftHandoff = new Map<string, SavedState>();

const BORRADOR_FLASH_MS = 4000;

/** Source of an unsaved copy (US-0122); dropped once the copy is saved for the first time. */
type DuplicadoState = {
  id: string;
  nombre: string;
  bannerUrl: string | null;
  ajustes: EventoDuplicadoAjustes;
};

type ShownValidation = { mode: EventoValidationMode; steps: ReadonlySet<EventoWizardStep> } | null;

export type EventoWizardSavingKind = 'borrador' | 'final' | null;

type ScalarDraftField = Exclude<keyof EventoDraft, 'entradas' | 'entrenadores' | 'cronograma' | 'incluye' | 'metodosPago'>;

type UseEventoWizardArgs = {
  tenantId: string;
  /** Present in edit mode. */
  eventoId?: string;
  /** Create mode only: the event to pre-fill the new draft from (US-0122). */
  duplicarDeId?: string;
  /** Ids of the tenant's active form templates (final-save check). */
  formulariosActivosIds: ReadonlySet<string>;
  /** Ids of the tenant's existing events, once loaded; used to drop deleted bundle members. */
  eventosExistentesIds: ReadonlySet<string> | null;
};

function parseStep(value: string | null): EventoWizardStep {
  return value === '2' ? 2 : value === '3' ? 3 : 1;
}

function mapEntrada(
  entradas: EventoEntradaDraft[],
  clientKey: string,
  update: (entrada: EventoEntradaDraft) => EventoEntradaDraft,
): EventoEntradaDraft[] {
  return entradas.map((entrada) => (entrada.clientKey === clientKey ? update(entrada) : entrada));
}

export function useEventoWizard({
  tenantId,
  eventoId: eventoIdProp,
  duplicarDeId: duplicarDeIdProp,
  formulariosActivosIds,
  eventosExistentesIds,
}: UseEventoWizardArgs) {
  const duplicarDeId = eventoIdProp ? undefined : duplicarDeIdProp;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const basePath = `/portal/orgs/${tenantId}/gestion-eventos`;

  // The id exists before the first save, so the banner path and the draft → edit URL switch need no round trip
  const [eventoId] = useState(() => eventoIdProp ?? crypto.randomUUID());
  const handoff = useRef<SavedState | undefined>(eventoIdProp ? draftHandoff.get(eventoIdProp) : undefined);

  const [esNuevo, setEsNuevo] = useState(!eventoIdProp);
  // New events count as drafts until published
  const [esBorrador, setEsBorrador] = useState(true);
  const [draft, setDraft] = useState<EventoDraft>(() => handoff.current?.draft ?? emptyEventoDraft());
  const [baseline, setBaseline] = useState(() => serializeDraft(handoff.current?.draft ?? emptyEventoDraft()));
  const [loading, setLoading] = useState((Boolean(eventoIdProp) && !handoff.current) || Boolean(duplicarDeId));
  const [duplicado, setDuplicado] = useState<DuplicadoState | null>(null);
  // Last complete event date: the reference for shifting ticket and coupon window ends when the date moves
  const fechaAncla = useRef('');
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ultimoGuardado, setUltimoGuardado] = useState<string | null>(handoff.current?.ultimoGuardado ?? null);
  const [borradorGuardadoFlash, setBorradorGuardadoFlash] = useState(Boolean(handoff.current));

  const [shownValidation, setShownValidation] = useState<ShownValidation>(null);
  const [focusRequest, setFocusRequest] = useState<{ key: string; nonce: number } | null>(null);

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Organization name for the preview (US-0120): the event's stored snapshot in edit mode, or the
  // tenant's current name before a new event's first save (the value the RPC will store on insert)
  const [storedNombreTenant, setStoredNombreTenant] = useState<string | null>(null);
  const tenantNombreActual = useTenantName(tenantId);

  const [savingKind, setSavingKind] = useState<EventoWizardSavingKind>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [bundleWarnings, setBundleWarnings] = useState<Record<string, number>>({});
  const bundleCleanupDone = useRef(false);

  const step = parseStep(searchParams.get('paso'));

  // ─── Load ───

  const load = useCallback(async () => {
    const sourceId = eventoIdProp ?? duplicarDeId;
    if (!sourceId) return;
    setLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const evento = await eventosService.getEventoCompleto(tenantId, sourceId);
      if (!evento) {
        setNotFound(true);
        return;
      }
      if (!eventoIdProp) {
        // Unsaved copy: the baseline stays the empty draft, so the copy is dirty from the start
        // ("Guardar borrador" enabled, leave guard armed)
        const copia = draftFromEventoDuplicado(evento, Date.now());
        fechaAncla.current = copia.fechaOriginal;
        setDraft(copia.draft);
        setDuplicado({
          id: evento.id,
          nombre: evento.nombre ?? '',
          bannerUrl: evento.banner_url,
          ajustes: copia.ajustes,
        });
        return;
      }
      const loaded = draftFromEventoCompleto(evento);
      setDraft(loaded);
      setBaseline(serializeDraft(loaded));
      setEsBorrador(evento.borrador);
      setStoredNombreTenant(evento.nombre_tenant ?? null);
      setUltimoGuardado(evento.borrador ? evento.updated_at : null);
    } catch (err) {
      console.error('Failed to load evento:', err);
      setLoadError(err instanceof EventoServiceError ? err.message : 'No se pudo cargar el evento.');
    } finally {
      setLoading(false);
    }
  }, [duplicarDeId, eventoIdProp, tenantId]);

  useEffect(() => {
    if (!eventoIdProp) {
      if (duplicarDeId) void load();
      return;
    }
    if (handoff.current) {
      // Hydrated from the first draft save; consume the handoff so a later reload reads from the DB
      draftHandoff.delete(eventoIdProp);
      setEsNuevo(false);
      setEsBorrador(true);
      return;
    }
    void load();
  }, [duplicarDeId, eventoIdProp, load]);

  // Bundled events deleted since the last save are dropped, with a warning on the ticket card
  useEffect(() => {
    if (loading || bundleCleanupDone.current || !eventosExistentesIds) return;
    bundleCleanupDone.current = true;
    const warnings: Record<string, number> = {};
    setDraft((current) => ({
      ...current,
      entradas: current.entradas.map((entrada) => {
        const kept = entrada.eventosIdBundle.filter((id) => eventosExistentesIds.has(id));
        const dropped = entrada.eventosIdBundle.length - kept.length;
        if (dropped === 0) return entrada;
        warnings[entrada.clientKey] = dropped;
        return { ...entrada, eventosIdBundle: kept };
      }),
    }));
    setBundleWarnings(warnings);
  }, [eventosExistentesIds, loading]);

  useEffect(() => {
    if (!borradorGuardadoFlash) return;
    const timeout = setTimeout(() => setBorradorGuardadoFlash(false), BORRADOR_FLASH_MS);
    return () => clearTimeout(timeout);
  }, [borradorGuardadoFlash]);

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    };
  }, [bannerPreviewUrl]);

  useEffect(() => {
    if (draft.fechaHora) fechaAncla.current = draft.fechaHora;
  }, [draft.fechaHora]);

  // ─── Dirty state & leave guard ───

  const isDirty = bannerFile !== null || serializeDraft(draft) !== baseline;

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ─── Validation (derived: re-runs live once shown, so errors clear as fields are fixed) ───

  const validationContext = useMemo(
    () => ({ esNuevo, formulariosActivosIds }),
    [esNuevo, formulariosActivosIds],
  );

  const errors = useMemo<EventoWizardErrors>(() => {
    if (!shownValidation) return {};
    const result = validateEventoDraft(draft, { ...validationContext, mode: shownValidation.mode });
    return Object.fromEntries(
      Object.entries(result.errors).filter(([key]) => shownValidation.steps.has(stepOfErrorKey(key))),
    );
  }, [draft, shownValidation, validationContext]);

  const stepsWithErrors = useMemo(
    () => Array.from(new Set(Object.keys(errors).map(stepOfErrorKey))).sort() as EventoWizardStep[],
    [errors],
  );

  // ─── Navigation ───

  const setStep = useCallback(
    (next: EventoWizardStep) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('paso', String(next));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const requestFocus = useCallback((key: string) => {
    setFocusRequest({ key, nonce: Date.now() });
  }, []);

  /** Backwards is always free; forwards in create mode validates the steps being skipped over. */
  const goTo = useCallback(
    (target: EventoWizardStep) => {
      if (target <= step || !esNuevo) {
        setStep(target);
        return true;
      }
      const skipped = new Set<EventoWizardStep>();
      for (let current = step; current < target; current += 1) skipped.add(current as EventoWizardStep);

      const result = validateEventoDraft(draft, { ...validationContext, mode: 'final' });
      const blockingKey = Object.keys(result.errors).find((key) => skipped.has(stepOfErrorKey(key)));
      if (blockingKey) {
        setShownValidation({ mode: 'final', steps: skipped });
        setStep(stepOfErrorKey(blockingKey));
        requestFocus(blockingKey);
        return false;
      }
      setStep(target);
      return true;
    },
    [draft, esNuevo, requestFocus, setStep, step, validationContext],
  );

  // ─── Mutators ───

  const updateField = useCallback(<K extends ScalarDraftField>(field: K, value: EventoDraft[K]) => {
    const ancla = fechaAncla.current;
    setDraft((current) => {
      const next = { ...current, [field]: value };
      // Ticket and coupon window ends keep their distance to the event when its date moves. The last
      // complete date is the reference, so clearing the field while retyping it does not lose it.
      if (field === 'fechaHora' && next.fechaHora !== current.fechaHora && next.fechaHora) {
        const mover = (hasta: string) => (ancla ? shiftWithEventoFecha(hasta, ancla, next.fechaHora) : hasta);
        next.entradas = current.entradas.map((entrada) => ({
          ...entrada,
          // Without any previous date, an empty end is the "until the event starts" default waiting for one
          validaHasta: !ancla && !entrada.validaHasta ? next.fechaHora : mover(entrada.validaHasta),
          cupones: entrada.cupones.map((cupon) => ({ ...cupon, validoHasta: mover(cupon.validoHasta) })),
        }));
      }
      return next;
    });
  }, []);

  const toggleEntrenador = useCallback((entrenador: { id: string; nombre: string }) => {
    setDraft((current) => {
      const exists = current.entrenadores.some((item) => item.id === entrenador.id);
      return {
        ...current,
        entrenadores: exists
          ? current.entrenadores.filter((item) => item.id !== entrenador.id)
          : [...current.entrenadores, { id: entrenador.id, nombre: entrenador.nombre, experiencia: '' }],
      };
    });
  }, []);

  const setEntrenadorExperiencia = useCallback((id: string, experiencia: string) => {
    setDraft((current) => ({
      ...current,
      entrenadores: current.entrenadores.map((item): EventoEntrenadorSnapshot =>
        item.id === id ? { ...item, experiencia } : item,
      ),
    }));
  }, []);

  const addCronograma = useCallback(() => {
    setDraft((current) => ({ ...current, cronograma: [...current.cronograma, { hora: '', descripcion: '' }] }));
  }, []);
  const updateCronograma = useCallback((index: number, key: keyof CronogramaItem, value: string) => {
    setDraft((current) => ({
      ...current,
      cronograma: current.cronograma.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    }));
  }, []);
  const removeCronograma = useCallback((index: number) => {
    setDraft((current) => ({ ...current, cronograma: current.cronograma.filter((_, rowIndex) => rowIndex !== index) }));
  }, []);

  const addIncluye = useCallback(() => {
    setDraft((current) => ({ ...current, incluye: [...current.incluye, { titulo: '', descripcion: '' }] }));
  }, []);
  const updateIncluye = useCallback((index: number, key: keyof IncluyeItem, value: string) => {
    setDraft((current) => ({
      ...current,
      incluye: current.incluye.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)),
    }));
  }, []);
  const removeIncluye = useCallback((index: number) => {
    setDraft((current) => ({ ...current, incluye: current.incluye.filter((_, rowIndex) => rowIndex !== index) }));
  }, []);

  const addEntrada = useCallback(() => {
    const clientKey = crypto.randomUUID();
    setDraft((current) => ({
      ...current,
      entradas: [...current.entradas, { ...emptyEntradaDraft(current.fechaHora), clientKey }],
    }));
    return clientKey;
  }, []);

  const updateEntrada = useCallback(
    (clientKey: string, patch: Partial<Omit<EventoEntradaDraft, 'clientKey' | 'id' | 'cupones'>>) => {
      setDraft((current) => ({
        ...current,
        entradas: mapEntrada(current.entradas, clientKey, (entrada) => {
          const next = { ...entrada, ...patch };
          // A Sencilla ticket never carries a bundle
          if (next.tipoEntrada === 'sencilla') next.eventosIdBundle = [];
          return next;
        }),
      }));
    },
    [],
  );

  const removeEntrada = useCallback((clientKey: string) => {
    setDraft((current) => ({ ...current, entradas: current.entradas.filter((entrada) => entrada.clientKey !== clientKey) }));
  }, []);

  const moveEntrada = useCallback((clientKey: string, direction: -1 | 1) => {
    setDraft((current) => {
      const index = current.entradas.findIndex((entrada) => entrada.clientKey === clientKey);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.entradas.length) return current;
      const entradas = current.entradas.slice();
      [entradas[index], entradas[target]] = [entradas[target], entradas[index]];
      return { ...current, entradas };
    });
  }, []);

  const addCupon = useCallback((entradaKey: string) => {
    const cupon = emptyCuponDraft();
    setDraft((current) => ({
      ...current,
      entradas: mapEntrada(current.entradas, entradaKey, (entrada) => ({ ...entrada, cupones: [...entrada.cupones, cupon] })),
    }));
    return cupon.clientKey;
  }, []);

  const updateCupon = useCallback(
    (entradaKey: string, cuponKey: string, patch: Partial<Omit<EventoCuponDraft, 'clientKey' | 'id'>>) => {
      const normalized = patch.cupon !== undefined ? { ...patch, cupon: patch.cupon.toUpperCase() } : patch;
      setDraft((current) => ({
        ...current,
        entradas: mapEntrada(current.entradas, entradaKey, (entrada) => ({
          ...entrada,
          cupones: entrada.cupones.map((cupon) => (cupon.clientKey === cuponKey ? { ...cupon, ...normalized } : cupon)),
        })),
      }));
    },
    [],
  );

  const removeCupon = useCallback((entradaKey: string, cuponKey: string) => {
    setDraft((current) => ({
      ...current,
      entradas: mapEntrada(current.entradas, entradaKey, (entrada) => ({
        ...entrada,
        cupones: entrada.cupones.filter((cupon) => cupon.clientKey !== cuponKey),
      })),
    }));
  }, []);

  const toggleMetodoPago = useCallback((metodo: EventoMetodoPagoSnapshot) => {
    setDraft((current) => {
      const exists = current.metodosPago.some((item) => item.id === metodo.id);
      return {
        ...current,
        metodosPago: exists
          ? current.metodosPago.filter((item) => item.id !== metodo.id)
          : [...current.metodosPago, metodo],
      };
    });
  }, []);

  const setMetodosPago = useCallback((metodos: EventoMetodoPagoSnapshot[]) => {
    setDraft((current) => ({ ...current, metodosPago: metodos }));
  }, []);

  // ─── Banner ───

  const selectBannerFile = useCallback(
    (file: File | null) => {
      setBannerError(null);
      if (!file) return;
      if (!EVENTO_BANNER_MIME_TYPES.includes(file.type)) {
        setBannerError('Formato no permitido. Usa JPEG, PNG o WebP.');
        return;
      }
      if (file.size > EVENTO_BANNER_MAX_BYTES) {
        setBannerError('La imagen no puede superar 5 MB.');
        return;
      }
      if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
      setBannerFile(file);
      setBannerPreviewUrl(URL.createObjectURL(file));
    },
    [bannerPreviewUrl],
  );

  const removeBanner = useCallback(() => {
    if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
    setBannerFile(null);
    setBannerPreviewUrl(null);
    setBannerError(null);
    setDraft((current) => ({ ...current, bannerUrl: null }));
  }, [bannerPreviewUrl]);

  // ─── Save ───

  const persist = useCallback(
    async (borrador: boolean): Promise<boolean> => {
      setSavingKind(borrador ? 'borrador' : 'final');
      setSaveError(null);
      try {
        let bannerUrl = draft.bannerUrl;
        if (bannerFile) {
          const upload = await storageService.uploadEventoBanner(createClient(), tenantId, eventoId, bannerFile);
          bannerUrl = upload.signedUrl;
        } else if (duplicado && esNuevo && bannerUrl && bannerUrl === duplicado.bannerUrl) {
          // The copy gets its own banner object; if that fails it keeps the source's URL rather than blocking the save
          try {
            const copy = await storageService.copyEventoBanner(createClient(), tenantId, eventoId, bannerUrl);
            bannerUrl = copy.signedUrl;
          } catch (err) {
            console.error('Failed to copy the duplicated evento banner:', err);
          }
        }

        const toSave: EventoDraft = { ...draft, bannerUrl };
        const result = await eventosService.guardarEventoCompleto(tenantId, eventoId, draftToPayload(toSave), {
          esNuevo,
          borrador,
        });

        // Attach the persisted ids so the next save updates these rows instead of inserting new ones
        const entradaIds = new Map(result.entradas.map((entrada) => [entrada.clientKey, entrada]));
        const saved: EventoDraft = {
          ...toSave,
          entradas: toSave.entradas.map((entrada) => {
            const persisted = entradaIds.get(entrada.clientKey);
            if (!persisted) return entrada;
            const cuponIds = new Map(persisted.cupones.map((cupon) => [cupon.clientKey, cupon.id]));
            return {
              ...entrada,
              id: persisted.id,
              cupones: entrada.cupones.map((cupon) => ({ ...cupon, id: cuponIds.get(cupon.clientKey) ?? cupon.id })),
            };
          }),
        };

        if (bannerPreviewUrl) URL.revokeObjectURL(bannerPreviewUrl);
        setBannerFile(null);
        setBannerPreviewUrl(null);
        setDraft(saved);
        setBaseline(serializeDraft(saved));
        setShownValidation(null);
        setDuplicado(null);

        if (!borrador) {
          const guardado = esNuevo || esBorrador ? 'creado' : 'editado';
          router.push(`${basePath}?guardado=${guardado}`);
          return true;
        }

        const now = new Date().toISOString();
        setUltimoGuardado(now);
        setBorradorGuardadoFlash(true);

        if (esNuevo) {
          draftHandoff.set(eventoId, { draft: saved, ultimoGuardado: now });
          setEsNuevo(false);
          router.replace(`${basePath}/${eventoId}/editar?paso=${step}`, { scroll: false });
        }
        return true;
      } catch (err) {
        console.error('Failed to save evento:', err);
        setSaveError(
          err instanceof EventoServiceError
            ? err.message
            : 'No se pudo guardar el evento. Revisa tu conexión e intenta de nuevo.',
        );
        return false;
      } finally {
        setSavingKind(null);
      }
    },
    [bannerFile, bannerPreviewUrl, basePath, draft, duplicado, esBorrador, esNuevo, eventoId, router, step, tenantId],
  );

  const runSave = useCallback(
    async (mode: EventoValidationMode) => {
      const result = validateEventoDraft(draft, { ...validationContext, mode });
      if (result.firstErrorKey) {
        setShownValidation({ mode, steps: new Set<EventoWizardStep>([1, 2, 3]) });
        const firstStep = stepOfErrorKey(result.firstErrorKey);
        if (firstStep !== step) setStep(firstStep);
        requestFocus(result.firstErrorKey);
        return false;
      }
      return persist(mode === 'borrador');
    },
    [draft, persist, requestFocus, setStep, step, validationContext],
  );

  const guardarBorrador = useCallback(() => runSave('borrador'), [runSave]);
  const guardarFinal = useCallback(() => runSave('final'), [runSave]);

  const isSaving = savingKind !== null;
  const mostrarGuardarBorrador = esNuevo || esBorrador;
  const canGuardarBorrador = mostrarGuardarBorrador && draft.nombre.trim().length > 0 && isDirty && !isSaving;

  return {
    tenantId,
    eventoId,
    basePath,
    esNuevo,
    esBorrador,
    loading,
    notFound,
    loadError,
    reload: load,
    duplicadoDe: duplicado ? { id: duplicado.id, nombre: duplicado.nombre } : null,
    duplicadoAjustes: duplicado?.ajustes ?? null,
    draft,
    isDirty,
    step,
    goTo,
    errors,
    stepsWithErrors,
    focusRequest,
    // mutators
    updateField,
    toggleEntrenador,
    setEntrenadorExperiencia,
    addCronograma,
    updateCronograma,
    removeCronograma,
    addIncluye,
    updateIncluye,
    removeIncluye,
    addEntrada,
    updateEntrada,
    removeEntrada,
    moveEntrada,
    addCupon,
    updateCupon,
    removeCupon,
    toggleMetodoPago,
    setMetodosPago,
    bundleWarnings,
    // banner
    nombreTenant: storedNombreTenant ?? tenantNombreActual,
    bannerDisplayUrl: bannerPreviewUrl ?? draft.bannerUrl,
    bannerError,
    selectBannerFile,
    removeBanner,
    // save
    savingKind,
    isSaving,
    saveError,
    ultimoGuardado,
    borradorGuardadoFlash,
    mostrarGuardarBorrador,
    canGuardarBorrador,
    guardarBorrador,
    guardarFinal,
  };
}

export type EventoWizardState = ReturnType<typeof useEventoWizard>;
