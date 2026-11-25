'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GritAlert,
  GritButton,
  GritDrawer,
  GritField,
  GritIcon,
  GritSwitch,
  cx,
  gritDescribedBy,
  gritFocusRing,
  gritInputClass,
  gritInputInvalidClass,
  gritSelectClass,
  gritSelectInvalidClass,
} from '@/components/ui';
import {
  METODO_PAGO_QR_MAX_BYTES,
  METODO_PAGO_QR_MIME_TYPES,
  type MetodoPago,
  type MetodoPagoTipo,
  type CreateMetodoPagoInput,
  type UpdateMetodoPagoInput,
  type MetodoPagoQrChange,
} from '@/types/portal/metodos-pago.types';

type MetodoPagoFormModalProps = {
  open: boolean;
  tenantId: string;
  editTarget: MetodoPago | null;
  isSubmitting: boolean;
  submitError: string | null;
  onClose: () => void;
  /** `'evento'`: a method that only exists in an event snapshot — no "Activo" toggle (US-0130). */
  variant?: 'tenant' | 'evento';
  onSubmit: (
    data: CreateMetodoPagoInput | UpdateMetodoPagoInput,
    qr: MetodoPagoQrChange,
  ) => Promise<void>;
};

const TIPO_OPTIONS: { value: MetodoPagoTipo; label: string }[] = [
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'pasarela', label: 'Pasarela' },
  { value: 'otro', label: 'Otro' },
];

type FieldErrors = {
  nombre?: string;
  tipo?: string;
  url?: string;
};

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Mounted per opening and per target (keyed), so the fields start from `editTarget` without a
 * reset effect.
 */
export function MetodoPagoFormModal(props: MetodoPagoFormModalProps) {
  if (!props.open) return null;
  return <MetodoPagoForm key={props.editTarget?.id ?? 'nuevo'} {...props} />;
}

function MetodoPagoForm({
  open,
  tenantId,
  editTarget,
  isSubmitting,
  submitError,
  onClose,
  variant = 'tenant',
  onSubmit,
}: MetodoPagoFormModalProps) {
  const [nombre, setNombre] = useState(() => editTarget?.nombre ?? '');
  const [tipo, setTipo] = useState<MetodoPagoTipo | ''>(() => editTarget?.tipo ?? '');
  const [valor, setValor] = useState(() => editTarget?.valor ?? '');
  const [url, setUrl] = useState(() => editTarget?.url ?? '');
  const [comentarios, setComentarios] = useState(() => editTarget?.comentarios ?? '');
  const [activo, setActivo] = useState(() => editTarget?.activo ?? true);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [qrRemove, setQrRemove] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Revoke object URL on cleanup
  useEffect(() => {
    return () => {
      if (qrPreviewUrl) URL.revokeObjectURL(qrPreviewUrl);
    };
  }, [qrPreviewUrl]);

  const handleQrSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow picking the same file again after an error or "Quitar"
    e.target.value = '';
    if (!file) return;

    if (!METODO_PAGO_QR_MIME_TYPES.includes(file.type)) {
      setQrError('Solo se permiten imágenes JPEG, PNG o WebP.');
      return;
    }

    if (file.size > METODO_PAGO_QR_MAX_BYTES) {
      setQrError('El archivo no puede superar 2 MB.');
      return;
    }

    setQrError(null);
    setQrFile(file);
    setQrPreviewUrl(URL.createObjectURL(file));
    setQrRemove(false);
  }, []);

  const handleQrRemove = useCallback(() => {
    setQrError(null);
    setQrFile(null);
    setQrPreviewUrl(null);
    setQrRemove(true);
  }, []);

  const validate = useCallback((): FieldErrors => {
    const errors: FieldErrors = {};
    if (!nombre.trim()) errors.nombre = 'El nombre es obligatorio.';
    if (!tipo) errors.tipo = 'El tipo es obligatorio.';
    if (url.trim() && !isValidUrl(url.trim())) errors.url = 'Ingresa una URL válida (https://…).';
    return errors;
  }, [nombre, tipo, url]);

  const handleSubmit = useCallback(async () => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const qr: MetodoPagoQrChange = { file: qrFile, remove: qrRemove };

    if (editTarget) {
      const payload: UpdateMetodoPagoInput = {
        nombre: nombre.trim(),
        tipo: tipo as MetodoPagoTipo,
        valor: valor.trim() || null,
        url: url.trim() || null,
        comentarios: comentarios.trim() || null,
        activo,
      };
      await onSubmit(payload, qr);
    } else {
      const payload: CreateMetodoPagoInput = {
        tenant_id: tenantId,
        nombre: nombre.trim(),
        tipo: tipo as MetodoPagoTipo,
        valor: valor.trim() || null,
        url: url.trim() || null,
        comentarios: comentarios.trim() || null,
        activo,
      };
      await onSubmit(payload, qr);
    }
  }, [validate, editTarget, nombre, tipo, valor, url, comentarios, activo, tenantId, onSubmit, qrFile, qrRemove]);

  const mode = editTarget ? 'edit' : 'create';
  const esEvento = variant === 'evento';
  const title = esEvento
    ? mode === 'create'
      ? 'Nuevo método de pago del evento'
      : 'Editar método de pago del evento'
    : mode === 'create'
      ? 'Crear método de pago'
      : 'Editar método de pago';
  const qrDisplayUrl = qrPreviewUrl ?? (qrRemove ? null : editTarget?.qr_url ?? null);
  const QR_HINT = 'JPEG, PNG o WebP. Máximo 2 MB.';

  return (
    <GritDrawer
      open={open}
      onClose={onClose}
      busy={isSubmitting}
      title={title}
      subtitle={
        esEvento
          ? 'Este método solo existe en este evento. No se guarda en los métodos de pago de tu organización.'
          : 'Configura los datos del método de pago para esta organización.'
      }
      footer={
        <>
          <GritButton variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </GritButton>
          <GritButton icon="save" onClick={() => void handleSubmit()} loading={isSubmitting} loadingLabel="Guardando…">
            {mode === 'create' ? 'Crear método' : 'Guardar cambios'}
          </GritButton>
        </>
      }
    >
      <div className="space-y-5">
        <GritField htmlFor="mp-nombre" label="Nombre" error={fieldErrors.nombre}>
          <input
            id="mp-nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: Nequi, Bancolombia, Efectivo"
            aria-invalid={fieldErrors.nombre ? true : undefined}
            aria-describedby={gritDescribedBy('mp-nombre', undefined, fieldErrors.nombre)}
            className={fieldErrors.nombre ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="mp-tipo" label="Tipo" error={fieldErrors.tipo}>
          <select
            id="mp-tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as MetodoPagoTipo)}
            disabled={isSubmitting}
            aria-invalid={fieldErrors.tipo ? true : undefined}
            aria-describedby={gritDescribedBy('mp-tipo', undefined, fieldErrors.tipo)}
            className={cx('grit-select-chevron', fieldErrors.tipo ? gritSelectInvalidClass : gritSelectClass)}
          >
            <option value="">Selecciona un tipo</option>
            {TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </GritField>

        <GritField htmlFor="mp-valor" label="Número" optional>
          <input
            id="mp-valor"
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            disabled={isSubmitting}
            placeholder="Ej: cuenta 123-456-789, CBU, número"
            className={gritInputClass}
          />
        </GritField>

        <GritField htmlFor="mp-url" label="URL" optional error={fieldErrors.url}>
          <input
            id="mp-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
            placeholder="https://…"
            aria-invalid={fieldErrors.url ? true : undefined}
            aria-describedby={gritDescribedBy('mp-url', undefined, fieldErrors.url)}
            className={fieldErrors.url ? gritInputInvalidClass : gritInputClass}
          />
        </GritField>

        <GritField htmlFor="mp-qr" label="Imagen QR" optional hint={QR_HINT} error={qrError}>
          <input
            ref={qrInputRef}
            id="mp-qr"
            type="file"
            accept={METODO_PAGO_QR_MIME_TYPES.join(',')}
            onChange={handleQrSelect}
            disabled={isSubmitting}
            aria-describedby={gritDescribedBy('mp-qr', QR_HINT, qrError)}
            className="sr-only"
          />
          {qrDisplayUrl ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDisplayUrl}
                alt={`Código QR de ${nombre.trim() || 'este método de pago'}`}
                className="h-40 w-40 shrink-0 rounded-grit-lg bg-white object-contain p-2"
              />
              <div className="flex flex-col gap-2">
                <GritButton size="sm" variant="secondary" onClick={() => qrInputRef.current?.click()} disabled={isSubmitting}>
                  Cambiar
                </GritButton>
                <GritButton size="sm" variant="danger" onClick={handleQrRemove} disabled={isSubmitting}>
                  Quitar
                </GritButton>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => qrInputRef.current?.click()}
              disabled={isSubmitting}
              className={cx(
                'flex w-full items-center justify-center gap-2 rounded-grit-lg border border-dashed border-white/[0.14] bg-white/[0.02] px-4 py-6 font-grit-body text-[13px] font-semibold text-grit-subtext transition hover:border-grit-cyan/45 hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60',
                gritFocusRing,
              )}
            >
              <GritIcon name="qr_code_2" size={16} />
              Subir imagen
            </button>
          )}
        </GritField>

        <GritField htmlFor="mp-comentarios" label="Comentarios" optional>
          <textarea
            id="mp-comentarios"
            rows={3}
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            disabled={isSubmitting}
            placeholder="Instrucciones de pago, titular de cuenta, etc."
            className={gritInputClass}
          />
        </GritField>

        {!esEvento && (
          <GritSwitch checked={activo} onChange={setActivo} disabled={isSubmitting} label="Método activo" showLabel />
        )}

        {submitError ? <GritAlert tone="danger">{submitError}</GritAlert> : null}
      </div>
    </GritDrawer>
  );
}
