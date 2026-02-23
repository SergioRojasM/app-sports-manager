export type OrganizationIdentityPayload = {
  tenantId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  foundedAt: string | null;
};

export type OrganizationContactPayload = {
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
};

export type OrganizationSocialPayload = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
};

export type OrganizationViewData = {
  identity: OrganizationIdentityPayload;
  contact: OrganizationContactPayload;
  social: OrganizationSocialPayload;
};

export type OrganizationViewErrorCode =
  | 'UNAUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'TENANT_NOT_FOUND'
  | 'UNKNOWN';

export type OrganizationViewError = {
  code: OrganizationViewErrorCode;
  message: string;
};

export type OrganizationViewState = {
  data: OrganizationViewData | null;
  loading: boolean;
  error: string | null;
};
