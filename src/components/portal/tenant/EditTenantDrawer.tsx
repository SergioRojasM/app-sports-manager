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
        className="absolute inset-0 bg-grit-bg/70 backdrop-blur-sm"
        onClick={onClose}
        disabled={isSubmitting}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Editar organización"
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-grit-glass-border bg-grit-card shadow-[0_18px_44px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between border-b border-grit-glass-border px-5 py-4">
          <div>
            <h2 className="font-grit-title text-lg font-semibold text-grit-text">Editar organización</h2>
            <p className="mt-1 text-xs text-grit-subtext">Actualiza la información principal de tu organización.</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/80 p-2 text-grit-subtext transition hover:text-grit-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">
              close
            </span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="rounded-grit-2xl border border-grit-glass-border bg-grit-bg/50 p-4 text-sm text-grit-subtext">
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
            <div className="mt-4 rounded-grit-md border border-grit-danger/40 bg-grit-danger/10 px-4 py-3 text-sm text-grit-danger" role="alert">
              {submitError}
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-grit-glass-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-grit-md border border-grit-glass-border bg-grit-bg/70 px-4 py-2 text-sm font-semibold text-grit-text transition hover:bg-grit-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={isSubmitting || isLoading}
            className="inline-flex items-center gap-2 rounded-grit-md bg-grit-cyan px-4 py-2 text-sm font-semibold text-grit-bg transition hover:bg-grit-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
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
