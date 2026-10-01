'use client';

import { cx, gritInputClass } from '@/components/ui';
import { FormularioCampoEditableField } from '@/components/portal/entrenamientos/reservas/FormularioRespuestaModal';
import { FormularioSeccionesGrouped } from '@/components/portal/formularios/FormularioSeccionesGrouped';
import type { UseEventoCompraResult } from '@/hooks/portal/eventos/useEventoCompra';
import type { CompradorInput } from '@/types/portal/eventos-compras.types';
import type { FormularioSeccion } from '@/types/portal/formularios.types';

type EventoCompraPasoDatosProps = {
  /** Organization name snapshot of the event, shown above the form. */
  nombreTenant: string;
  compra: UseEventoCompraResult;
  headingId: string;
};

const PERFIL_INPUT_TYPE: Record<string, string> = {
  fecha_exp_identificacion: 'date',
  peso_kg: 'number',
  altura_cm: 'number',
};

const PERFIL_PLACEHOLDER: Record<string, string> = {
  tipo_identificacion: 'Ej. CC 1234567890',
  rh: 'Ej. O+',
};

function Campo({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-grit-body text-xs font-semibold text-grit-subtext">
        {label}
        <span className="text-grit-danger"> *</span>
      </label>
      {children}
      {hint && !error && <p className="font-grit-body text-[11px] text-grit-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="font-grit-body text-xs text-grit-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Header of the event form, built only from the snapshot rows and the event's organization name.
 * `FormularioHeaderEditor` is not used here: it reads `tenants`, which a guest cannot.
 */
function FormularioHeader({ nombreTenant, nombre, secciones }: { nombreTenant: string; nombre: string; secciones: FormularioSeccion[] }) {
  const texto = (tipo: string) => secciones.find((seccion) => seccion.seccion_tipo === tipo)?.seccion_descripcion?.trim() || null;
  const badges = (secciones.find((seccion) => seccion.seccion_tipo === 'encabezado_badges')?.campo_lista_valores ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const sobretitulo = texto('encabezado_sobretitulo');
  const subtitulo = texto('encabezado_subtitulo');

  return (
    <div className="flex flex-col items-center gap-2 border-b border-grit-glass-border px-5 py-5 text-center">
      {nombreTenant && (
        <span className="font-grit-body text-[11px] font-bold uppercase tracking-[0.15em] text-grit-subtext">{nombreTenant}</span>
      )}
      {sobretitulo && <span className="font-grit-body text-xs font-semibold text-grit-cyan">{sobretitulo}</span>}
      <h4 className="font-grit-title text-lg font-bold text-grit-text">{texto('encabezado_titulo') ?? nombre}</h4>
      {subtitulo && <p className="font-grit-body text-xs text-grit-subtext">{subtitulo}</p>}
      {badges.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {badges.map((badge) => (
            <span key={badge} className="rounded-grit-sm border border-grit-glass-border px-2 py-1 font-grit-body text-[11px] font-semibold text-grit-subtext">
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Step 2: the fixed buyer fields, the profile fields the event form requests, and the form itself
 * (from the event's snapshot). Nothing typed here updates the user's profile (US-0121).
 */
export function EventoCompraPasoDatos({ nombreTenant, compra, headingId }: EventoCompraPasoDatosProps) {
  const { comprador, errors, esUsuario, submitting, compraIniciada } = compra;
  const disabled = submitting || compraIniciada;

  const input = (field: keyof CompradorInput, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      id={`comprador-${field}`}
      value={comprador[field]}
      onChange={(event) => compra.updateComprador(field, event.target.value)}
      disabled={disabled}
      aria-invalid={errors[field] ? true : undefined}
      aria-describedby={errors[field] ? `comprador-${field}-error` : undefined}
      className={gritInputClass}
      {...props}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <h3 id={headingId} tabIndex={-1} className="font-grit-title text-base font-bold text-grit-text outline-none">
        Tus datos
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Campo id="comprador-nombre" label="Nombre completo" error={errors.nombre}>
            {input('nombre', { type: 'text', maxLength: 150, autoComplete: 'name' })}
          </Campo>
        </div>

        {esUsuario ? (
          <div className="sm:col-span-2">
            <Campo id="comprador-email" label="Correo" hint="Es el correo de tu cuenta.">
              {input('email', { type: 'email', readOnly: true, disabled: true })}
            </Campo>
          </div>
        ) : (
          <>
            <Campo id="comprador-email" label="Correo" error={errors.email}>
              {input('email', { type: 'email', maxLength: 254, autoComplete: 'email', inputMode: 'email' })}
            </Campo>
            <Campo id="comprador-emailConfirmacion" label="Confirma tu correo" error={errors.emailConfirmacion}>
              {input('emailConfirmacion', { type: 'email', maxLength: 254, autoComplete: 'off', inputMode: 'email' })}
            </Campo>
          </>
        )}

        <Campo id="comprador-fechaNacimiento" label="Fecha de nacimiento" error={errors.fechaNacimiento}>
          {input('fechaNacimiento', { type: 'date', min: '1900-01-02', autoComplete: 'bday' })}
        </Campo>

        {compra.perfilRequeridos.map(({ key, label }) => {
          const id = `perfil-${key}`;
          const error = errors[`perfil.${key}`];
          return (
            <Campo key={key} id={id} label={label} error={error}>
              <input
                id={id}
                type={PERFIL_INPUT_TYPE[key] ?? 'text'}
                value={compra.perfilValores[key] ?? ''}
                placeholder={PERFIL_PLACEHOLDER[key]}
                onChange={(event) => compra.updatePerfil(key, event.target.value)}
                disabled={disabled}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={gritInputClass}
              />
            </Campo>
          );
        })}
      </div>

      {compra.formulario && compra.camposFormulario.length > 0 && (
        <section className={cx('flex flex-col gap-4 rounded-grit-2xl border border-grit-glass-border bg-grit-card/40')}>
          <FormularioHeader nombreTenant={nombreTenant} nombre={compra.formulario.nombre} secciones={compra.headerFormulario} />
          <div className="px-4 pb-4 sm:px-5">
            <FormularioSeccionesGrouped
              secciones={compra.camposFormulario}
              renderDatos={(seccion) => (
                <FormularioCampoEditableField
                  seccion={seccion}
                  value={compra.respuestas[seccion.campo_nombre ?? ''] ?? ''}
                  error={seccion.campo_nombre ? errors[seccion.campo_nombre] || undefined : undefined}
                  uploading={false}
                  onUpdateValue={compra.updateRespuesta}
                  onUploadImage={compra.seleccionarImagen}
                  disabled={disabled}
                />
              )}
            />
          </div>
        </section>
      )}

      <p className="font-grit-body text-[11px] leading-relaxed text-grit-muted">
        Estos datos solo se usan para esta compra y no modifican tu perfil. Los datos solicitados por la organización son
        de uso exclusivo de la organización y son de su responsabilidad.
      </p>
    </div>
  );
}
