// Types and path helpers for Supabase Object Storage (org-assets bucket)

export const STORAGE_BUCKET = 'org-assets';

/** Default signed URL TTL: 1 year in seconds */
export const SIGNED_URL_TTL = 31_536_000;

// ─── Path builders ───

/** Logo path: orgs/{tenantId}/brand/logo.{ext} */
export function buildOrgLogoPath(tenantId: string, ext: string): string {
  return `orgs/${tenantId}/brand/logo.${ext}`;
}

/** Receipt path: orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext} */
export function buildReceiptPath(
  tenantId: string,
  userId: string,
  pagoId: string,
  ext: string,
): string {
  return `orgs/${tenantId}/users/${userId}/receipts/${pagoId}.${ext}`;
}

// ─── Result types ───

export type StorageUploadResult = {
  signedUrl: string;
  path: string;
};

export type UploadOrgLogoInput = {
  tenantId: string;
  file: File;
};

export type UploadPaymentProofInput = {
  tenantId: string;
  userId: string;
  pagoId: string;
  file: File;
};
