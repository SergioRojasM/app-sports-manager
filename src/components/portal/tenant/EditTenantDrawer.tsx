'use client';

import { useEffect } from 'react';
import { EditTenantForm } from './EditTenantForm';
import type {
  TenantEditFieldErrors,
  TenantEditFormValues,
} from '@/types/portal/tenant.types';

type LogoUploadState = {
  previewUrl: string | null;
  error: string | null;
  uploading: boolean;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type EditTenantDrawerProps = {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  values: TenantEditFormValues;
  errors: TenantEditFieldErrors;
  submitError: string | null;
  onClose: () => void;
  onSubmit: () => Promise<boolean>;
  onChangeField: (field: keyof TenantEditFormValues, value: string) => void;
  logoUpload?: LogoUploadState;
  bannerUpload?: LogoUploadState;
};

export function EditTenantDrawer({
  isOpen,
  isLoading,
  isSubmitting,
  values,
  errors,
  submitError,
  onClose,
  onSubmit,
  onChangeField,
  logoUpload,
  bannerUpload,
}: EditTenantDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Cerrar edición de organización"
        className="absolute inset-0 bg-slate-950/70"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Editar organización"
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-portal-border bg-navy-medium shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-portal-border px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Editar organización</h2>
            <p className="mt-1 text-xs text-slate-400">Actualiza la información principal de tu organización.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg border border-portal-border bg-navy-deep/80 p-2 text-slate-300 transition hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="rounded-lg border border-portal-border bg-navy-deep/50 p-4 text-sm text-slate-300">
              Cargando información editable...
            </div>
          ) : (
            <EditTenantForm
              values={values}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={onChangeField}
              logoUpload={logoUpload}
              bannerUpload={bannerUpload}
            />
          )}

          {submitError ? (
            <div className="mt-4 rounded-lg border border-rose-400/40 bg-rose-950/35 px-4 py-3 text-sm text-rose-200" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-portal-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-portal-border bg-navy-deep/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-turquoise px-4 py-2 text-sm font-semibold text-navy-deep transition hover:bg-turquoise/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              save
            </span>
          </button>
        </footer>
      </aside>
    </div>
  );
}
