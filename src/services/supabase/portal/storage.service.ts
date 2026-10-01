import type { SupabaseClient } from '@supabase/supabase-js';
import {
  STORAGE_BUCKET,
  SIGNED_URL_TTL,
  buildOrgLogoPath,
  buildOrgBannerPath,
  buildReceiptPath,
  buildFormularioRespuestaFilePath,
  buildEventoBannerPath,
  type StorageUploadResult,
} from '@/types/portal/storage.types';

const EVENTO_BANNER_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

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
   * Upload (upsert) a team event banner and return a signed URL (US-0119).
   * Path: orgs/{tenantId}/eventos/{eventoId}.{ext}
   */
  async uploadEventoBanner(
    supabase: SupabaseClient,
    tenantId: string,
    eventoId: string,
    file: File,
  ): Promise<StorageUploadResult> {
    const ext = getExtension(file);
    const path = buildEventoBannerPath(tenantId, eventoId, ext);

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
   * Gives a duplicated event its own banner object (US-0122): downloads the source image and
   * uploads it under the new event's path, so replacing the source banner later does not change the copy.
   */
  async copyEventoBanner(
    supabase: SupabaseClient,
    tenantId: string,
    eventoId: string,
    sourceUrl: string,
  ): Promise<StorageUploadResult> {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`No fue posible descargar la imagen original (${response.status}).`);
    }

    const blob = await response.blob();
    const ext = EVENTO_BANNER_EXTENSIONS[blob.type];
    if (!ext) {
      throw new Error(`Formato de imagen no permitido: ${blob.type || 'desconocido'}.`);
    }

    const file = new File([blob], `banner.${ext}`, { type: blob.type });
    return storageService.uploadEventoBanner(supabase, tenantId, eventoId, file);
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
