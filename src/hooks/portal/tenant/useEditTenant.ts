'use client';

import { useCallback, useMemo, useState } from 'react';
import { createClient } from '@/services/supabase/client';
import { tenantService } from '@/services/supabase/portal/tenant.service';
import type {
  TenantEditFieldErrors,
  TenantEditFormValues,
  TenantEditPayload,
} from '@/types/portal/tenant.types';

const EMPTY_VALUES: TenantEditFormValues = {
  nombre: '',
  descripcion: '',
  logo_url: '',
  email: '',
  telefono: '',
  web_url: '',
  instagram_url: '',
  facebook_url: '',
  x_url: '',
  banner_url: '',
  max_solicitudes: '2',
  requiere_perfil_completo: 'false',
};

const URL_FIELDS: Array<keyof TenantEditFormValues> = [
  'web_url',
  'instagram_url',
  'facebook_url',
  'x_url',
];

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPayload(values: TenantEditFormValues): TenantEditPayload {
  const maxSolicitudes = Math.max(1, Math.min(10, parseInt(values.max_solicitudes, 10) || 2));
  return {
    nombre: values.nombre.trim(),
    descripcion: normalizeNullable(values.descripcion),
    logo_url: normalizeNullable(values.logo_url),
    email: values.email.trim(),
    telefono: normalizeNullable(values.telefono),
    web_url: normalizeNullable(values.web_url),
    instagram_url: normalizeNullable(values.instagram_url),
    facebook_url: normalizeNullable(values.facebook_url),
    x_url: normalizeNullable(values.x_url),
    banner_url: normalizeNullable(values.banner_url),
    max_solicitudes: maxSolicitudes,
    requiere_perfil_completo: values.requiere_perfil_completo === 'true',
  };
}

function validate(values: TenantEditFormValues): TenantEditFieldErrors {
  const errors: TenantEditFieldErrors = {};

  const nombre = values.nombre.trim();
  const email = values.email.trim();

  if (!nombre) {
    errors.nombre = 'El nombre es obligatorio.';
  } else if (nombre.length < 2 || nombre.length > 120) {
    errors.nombre = 'El nombre debe tener entre 2 y 120 caracteres.';
  }

  if (!email) {
    errors.email = 'El correo es obligatorio.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Ingresa un correo válido.';
  }

  const descripcion = values.descripcion.trim();
  if (descripcion.length > 500) {
    errors.descripcion = 'La descripción debe tener máximo 500 caracteres.';
  }

  const telefono = values.telefono.trim();
  if (telefono && (telefono.length > 30 || !/^[+()\-\s\d]+$/.test(telefono))) {
    errors.telefono = 'Ingresa un teléfono válido de máximo 30 caracteres.';
  }

  for (const field of URL_FIELDS) {
    const value = values[field].trim();
    if (value && !isValidUrl(value)) {
      errors[field] = 'Ingresa una URL válida (http o https).';
    }
  }

  const maxSol = parseInt(values.max_solicitudes, 10);
  if (Number.isNaN(maxSol) || maxSol < 1 || maxSol > 10) {
    errors.max_solicitudes = 'El valor debe ser un entero entre 1 y 10.';
  }

  return errors;
}

type UseEditTenantOptions = {
  tenantId: string;
  onSaved: () => Promise<void>;
  uploadLogo?: () => Promise<string | null>;
  uploadBanner?: () => Promise<string | null>;
};

type UseEditTenantResult = {
  isDrawerOpen: boolean;
  isInitialLoading: boolean;
  isSubmitting: boolean;
  values: TenantEditFormValues;
  fieldErrors: TenantEditFieldErrors;
  submitError: string | null;
  successMessage: string | null;
  openDrawer: () => Promise<void>;
  closeDrawer: () => void;
  updateField: (field: keyof TenantEditFormValues, value: string) => void;
  submit: () => Promise<boolean>;
};

export function useEditTenant({ tenantId, onSaved, uploadLogo, uploadBanner }: UseEditTenantOptions): UseEditTenantResult {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState<TenantEditFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<TenantEditFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const openDrawer = useCallback(async () => {
    setIsInitialLoading(true);
    setSubmitError(null);
    setFieldErrors({});
    setSuccessMessage(null);
    setIsDrawerOpen(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      const initialValues = await tenantService.fetchTenantEditData(supabase, user.id, tenantId);
      setValues(initialValues);
    } catch {
      setSubmitError('No fue posible cargar la información editable de la organización.');
      setValues(EMPTY_VALUES);
    } finally {
      setIsInitialLoading(false);
    }
  }, [supabase, tenantId]);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    setFieldErrors({});
    setSubmitError(null);
  }, []);

  const updateField = useCallback((field: keyof TenantEditFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    setSubmitError(null);
    setSuccessMessage(null);

    const errors = validate(values);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No active session');
      }

      // If a new logo file was selected, upload it first
      let logoUrl = values.logo_url;
      if (uploadLogo) {
        const signedUrl = await uploadLogo();
        if (signedUrl) {
          logoUrl = signedUrl;
        }
      }

      // If a new banner file was selected, upload it first
      let bannerUrl = values.banner_url;
      if (uploadBanner) {
        const signedUrl = await uploadBanner();
        if (signedUrl) {
          bannerUrl = signedUrl;
        }
      }

      const payload = toPayload({ ...values, logo_url: logoUrl, banner_url: bannerUrl });
      await tenantService.updateTenant(supabase, user.id, tenantId, payload);
      await onSaved();
      setSuccessMessage('La organización se actualizó correctamente.');
      setIsDrawerOpen(false);
      return true;
    } catch {
      setSubmitError('No fue posible guardar los cambios. Inténtalo nuevamente.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [onSaved, supabase, tenantId, values, uploadLogo, uploadBanner]);

  return {
    isDrawerOpen,
    isInitialLoading,
    isSubmitting,
    values,
    fieldErrors,
    submitError,
    successMessage,
    openDrawer,
    closeDrawer,
    updateField,
    submit,
  };
}
