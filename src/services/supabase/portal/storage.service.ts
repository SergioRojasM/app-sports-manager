import type { SupabaseClient } from '@supabase/supabase-js';
import {
  STORAGE_BUCKET,
  SIGNED_URL_TTL,
  buildOrgLogoPath,
  buildOrgBannerPath,
  buildReceiptPath,
  buildFormularioRespuestaFilePath,
  buildEntrenamientoPublicoBannerPath,
  type StorageUploadResult,
} from '@/types/portal/storage.types';

function getExtension(file: File): string {
  const name = file.name;
  const dot = name.lastIndexOf('.');
  return dot !== -1 ? name.slice(dot + 1).toLowerCase() : 'bin';
}

export const storageService = {
  /**
   * Upload (upsert) the org logo and return a signed URL.
   * Path: orgs/{tenantId}/brand/logo.{ext}
   */
  async uploadOrgLogo(
    supabase: SupabaseClient,
    tenantId: string,
    file: File,
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildOrgLogoPath(tenantId, ext);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      throw new Error(signError?.message ?? 'No fue posible generar la URL firmada.');
    }

    return { signedUrl: signedData.signedUrl, path };
  },

  /**
   * Upload (upsert) the org banner and return a signed URL.
   * Path: orgs/{tenantId}/brand/banner.{ext}
   */
  async uploadOrgBanner(
    supabase: SupabaseClient,
    tenantId: string,
    file: File,
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildOrgBannerPath(tenantId, ext);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      throw new Error(signError?.message ?? 'No fue posible generar la URL firmada.');
    }

    return { signedUrl: signedData.signedUrl, path };
  },

  /**
   * Upload a payment proof and return a signed URL.
   * Path: orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}
   */
  async uploadPaymentProof(
    supabase: SupabaseClient,
    tenantId: string,
    userId: string,
    pagoId: string,
    file: File,
    options?: { upsert?: boolean },
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildReceiptPath(tenantId, userId, pagoId, ext);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: options?.upsert ?? false, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      throw new Error(signError?.message ?? 'No fue posible generar la URL firmada.');
    }

    return { signedUrl: signedData.signedUrl, path };
  },

  /**
   * Upload an "imagen"-type form response file and return a signed URL.
   * Path: orgs/{tenantId}/users/{atletaId}/formularios/{formularioPlantillaId}/{campoNombre}-{timestamp}.{ext}
   * `atletaId` is always the booking athlete's own id, even when staff uploads on their behalf.
   */
  async uploadFormularioRespuestaImage(
    supabase: SupabaseClient,
    tenantId: string,
    atletaId: string,
    formularioPlantillaId: string,
    campoNombre: string,
    file: File,
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildFormularioRespuestaFilePath(tenantId, atletaId, formularioPlantillaId, campoNombre, ext);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      throw new Error(signError?.message ?? 'No fue posible generar la URL firmada.');
    }

    return { signedUrl: signedData.signedUrl, path };
  },

  /**
   * Upload (upsert) a training publication banner and return a signed URL.
   * Path: orgs/{tenantId}/entrenamientos-publicos/{entrenamientoId}.{ext}
   */
  async uploadEntrenamientoPublicoBanner(
    supabase: SupabaseClient,
    tenantId: string,
    entrenamientoId: string,
    file: File,
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildEntrenamientoPublicoBannerPath(tenantId, entrenamientoId, ext);

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signError || !signedData?.signedUrl) {
      throw new Error(signError?.message ?? 'No fue posible generar la URL firmada.');
    }

    return { signedUrl: signedData.signedUrl, path };
  },

  /**
   * Generate a signed URL for an existing storage path.
   * Default TTL: 1 year.
   */
  async getSignedUrl(
    supabase: SupabaseClient,
    path: string,
    expiresIn: number = SIGNED_URL_TTL,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(error?.message ?? 'No fue posible generar la URL firmada.');
    }

    return data.signedUrl;
  },
};
