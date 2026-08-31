'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PublicTrainingBannerModal } from './PublicTrainingBannerModal';
import { useFormularioPreview } from '@/hooks/portal/entrenamientos-publicos/useFormularioPreview';
import { FormularioPreviewModal } from '@/components/portal/formularios/FormularioPreviewModal';
import { PlanesPublicosModal } from '@/components/portal/planes-publicos';
import type { PrecioItem } from '@/types/portal/entrenamientos-publicos.types';

export type PublicTrainingCardData = {
  nombre: string;
  tenantId: string;
  /**
   * Source entrenamientos.id, used to build the "Ver detalles" link (US-0109).
   * Omitted in the publish modal's live preview, where the training may not be
   * published yet and therefore has no live detail URL.
   */
  entrenamientoId?: string;
  tenantNombre?: string;
  descripcion: string | null;
  disciplinaNombre: string;
  escenarioNombre: string;
  escenarioUbicacion: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  reservasActivas: number;
  reservaAntelacionHoras: number | null;
  /** Pricing options. Empty means Gratis; two or more render as "Desde …" (US-0109). */
  precio: PrecioItem[];
  bannerUrl: string | null;
  /** Services the training requires. Empty on the anonymous landing page (US-0094). */
  serviciosRequeridos?: string[];
  /** Internal formulario id, for the "Vista previa" card action. Null/undefined when none or on the anonymous landing page (US-0101). */
  formularioId?: string | null;
  /** External formulario URL, used when no internal formulario is attached (US-0101). */
  formularioExterno?: string | null;
};

type PublicTrainingCardProps = {
  data: PublicTrainingCardData;
  featured?: boolean;
  onReservar?: () => void;
  reservarDisabled?: boolean;
};

function formatDateLabel(fechaHora: string | null): string {
  if (!fechaHora) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(fechaHora));
}

function formatTimeLabel(fechaHora: string | null): string {
  if (!fechaHora) return '';
  return new Intl.DateTimeFormat('es-CO', { timeStyle: 'short' }).format(new Date(fechaHora));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

/**
 * Zero options reads as "Gratis", one shows that price outright, and two or more
 * collapse to the cheapest as "Desde …" so the card stays a single line (US-0109).
 */
function formatPrecio(precio: PrecioItem[]): string {
  if (precio.length === 0) return 'Gratis';
  if (precio.length === 1) return formatCurrency(precio[0].precio);
  return `Desde ${formatCurrency(Math.min(...precio.map((item) => item.precio)))}`;
}

export function PublicTrainingCard({ data, featured = false, onReservar, reservarDisabled = false }: PublicTrainingCardProps) {
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [planesModalOpen, setPlanesModalOpen] = useState(false);
  const formularioPreview = useFormularioPreview();
  // Read here rather than threaded as a prop so the same card links back to
  // whichever grid rendered it — portal marketplace or public landing (US-0109)
  const pathname = usePathname();
  const detalleHref = data.entrenamientoId
    ? `/entrenamientos-publicos/${data.entrenamientoId}?from=${encodeURIComponent(pathname)}`
    : null;
  const cupoMaximo = data.cupoMaximo ?? 0;
  // Empty on the anonymous landing page — that surface never receives service names (US-0094)
  const serviciosRequeridos = data.serviciosRequeridos ?? [];
  const ocupacionRatio = cupoMaximo > 0 ? Math.min(1, data.reservasActivas / cupoMaximo) : 0;
  // Null/undefined on the anonymous landing page and (unless wired) the admin publish
  // preview — the actions below simply don't render without this data (US-0101)
  const hasInternalFormulario = Boolean(data.formularioId);
  const hasExternalFormulario = !hasInternalFormulario && Boolean(data.formularioExterno);

  return (
    <>
      <div
        className={`flex flex-col overflow-hidden rounded-2xl border transition ${
          featured ? 'border-landing-primary/60 shadow-[0_0_32px_rgba(20,219,196,0.15)]' : 'border-landing-border'
        }`}
      >
        <div className="relative h-64 w-full overflow-hidden">
          {data.bannerUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.bannerUrl} alt={data.nombre} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Ver imagen"
                onClick={(e) => {
                  e.stopPropagation();
                  setBannerModalOpen(true);
                }}
                className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-landing-border bg-landing-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-text transition hover:text-landing-primary"
              >
                <span className="material-symbols-outlined text-xs" aria-hidden="true">
                  visibility
                </span>
                Ver
              </button>
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-landing-text-secondary/40" aria-hidden="true">
                image
              </span>
            </div>
          )}

          {featured && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md border border-landing-primary/50 bg-landing-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-primary">
              <span className="material-symbols-outlined text-xs" aria-hidden="true">
                star
              </span>
              Próximo
            </span>
          )}

          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md border border-landing-border bg-landing-bg/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-landing-text">
            <span className="material-symbols-outlined text-xs text-landing-primary" aria-hidden="true">
              directions_run
            </span>
            {data.disciplinaNombre}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 bg-landing-surface-card/80 p-3.5 backdrop-blur">
          <h3 className="font-landing-display text-lg italic font-bold text-landing-text">{data.nombre}</h3>

          {data.tenantNombre && (
            <p className="-mt-1 flex items-center gap-1 font-landing-body text-xs font-semibold text-landing-primary">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                shield
              </span>
              {data.tenantNombre}
            </p>
          )}

          {data.descripcion && (
            <p className="line-clamp-2 whitespace-pre-wrap font-landing-body text-sm text-landing-text-secondary">
              {data.descripcion}
            </p>
          )}

          <div className="grid grid-cols-3 gap-1 font-landing-body text-[10px] text-landing-text-secondary">
            <div className="flex flex-col gap-0">
              <span className="flex items-center gap-0.5 font-semibold text-landing-text">
                <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                  calendar_month
                </span>
                {formatDateLabel(data.fechaHora)}
              </span>
              <span>{formatTimeLabel(data.fechaHora)}</span>
            </div>
            <div className="flex flex-col gap-0">
              <span className="flex items-center gap-0.5 font-semibold text-landing-text">
                <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                  location_on
                </span>
                {data.escenarioNombre}
              </span>
              <span>{data.escenarioUbicacion ?? ''}</span>
            </div>
            <div className="flex flex-col gap-0">
              <span className="flex items-center gap-0.5 font-semibold text-landing-text">
                <span className="material-symbols-outlined text-[11px] text-landing-primary" aria-hidden="true">
                  groups
                </span>
                {data.reservasActivas}/{cupoMaximo || '—'}
              </span>
              <span>cupos</span>
            </div>
          </div>

          {data.reservaAntelacionHoras != null && (
            <p className="flex items-center gap-1 font-landing-body text-[11px] text-landing-text-secondary">
              <span className="material-symbols-outlined text-[13px] text-landing-primary" aria-hidden="true">
                schedule
              </span>
              Reserva con al menos {data.reservaAntelacionHoras}h de anticipación
            </p>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between font-landing-body text-[11px] font-semibold text-landing-text-secondary">
              <span>Ocupación</span>
              <span className="text-landing-primary">{Math.round(ocupacionRatio * 100)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-landing-surface-elevated">
              <div
                className="h-full rounded-full bg-gradient-to-r from-landing-primary-dark to-landing-primary"
                style={{ width: `${Math.round(ocupacionRatio * 100)}%` }}
              />
            </div>
          </div>

          {serviciosRequeridos.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-landing-text-muted">
              <span className="material-symbols-outlined text-sm" aria-hidden="true">
                info
              </span>
              <span>
                Este entrenamiento requiere una suscripción activa que incluya{' '}
                {serviciosRequeridos.length === 1 ? 'el servicio de' : 'los servicios de'}:{' '}
                <span className="font-semibold">{serviciosRequeridos.join(', ')}</span>
              </span>
            </p>
          ) : null}

          {(hasInternalFormulario || hasExternalFormulario || serviciosRequeridos.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {hasInternalFormulario && (
                <button
                  type="button"
                  onClick={() => data.formularioId && formularioPreview.openPreview(data.formularioId)}
                  className="inline-flex items-center gap-1 rounded-md border border-landing-border px-2.5 py-1 font-landing-body text-[11px] font-semibold text-landing-text-secondary transition hover:border-landing-primary/40 hover:text-landing-primary"
                >
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    description
                  </span>
                  Ver formulario
                </button>
              )}
              {hasExternalFormulario && (
                <a
                  href={data.formularioExterno ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-landing-border px-2.5 py-1 font-landing-body text-[11px] font-semibold text-landing-text-secondary transition hover:border-landing-primary/40 hover:text-landing-primary"
                >
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    open_in_new
                  </span>
                  Ver formulario externo
                </a>
              )}
              {serviciosRequeridos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPlanesModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-landing-border px-2.5 py-1 font-landing-body text-[11px] font-semibold text-landing-text-secondary transition hover:border-landing-primary/40 hover:text-landing-primary"
                >
                  <span className="material-symbols-outlined text-xs" aria-hidden="true">
                    card_membership
                  </span>
                  Adquirir plan
                </button>
              )}
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-3 pt-1">
            <span className="font-landing-display text-base font-bold text-landing-text">{formatPrecio(data.precio)}</span>
            <div className="flex items-center gap-2">
              {detalleHref && (
                <Link
                  href={detalleHref}
                  className="rounded-lg border border-landing-border px-3 py-2 font-landing-body text-sm font-semibold text-landing-text-secondary transition hover:border-landing-primary/40 hover:text-landing-primary"
                >
                  Ver detalles
                </Link>
              )}
              <button
                type="button"
                onClick={onReservar}
                disabled={reservarDisabled || !onReservar}
                aria-disabled={reservarDisabled || !onReservar}
                title={reservarDisabled ? 'No disponible' : undefined}
                className="rounded-lg bg-landing-primary px-4 py-2 font-landing-body text-sm font-semibold text-landing-bg transition hover:bg-landing-primary-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reservar
              </button>
            </div>
          </div>
        </div>
      </div>

      {data.bannerUrl && (
        <PublicTrainingBannerModal
          open={bannerModalOpen}
          bannerUrl={data.bannerUrl}
          alt={data.nombre}
          onClose={() => setBannerModalOpen(false)}
        />
      )}

      {hasInternalFormulario && (
        <FormularioPreviewModal
          open={formularioPreview.open}
          tenantId={data.tenantId}
          plantillaNombre={formularioPreview.plantillaNombre}
          secciones={formularioPreview.secciones}
          perfilCamposRequeridos={formularioPreview.perfilCamposRequeridos}
          loading={formularioPreview.loading}
          error={formularioPreview.error}
          onClose={formularioPreview.closePreview}
        />
      )}

      {serviciosRequeridos.length > 0 && (
        <PlanesPublicosModal
          open={planesModalOpen}
          tenantId={data.tenantId}
          tenantNombre={data.tenantNombre ?? 'la organización'}
          onClose={() => setPlanesModalOpen(false)}
          initialSearch={serviciosRequeridos[0]}
        />
      )}
    </>
  );
}
