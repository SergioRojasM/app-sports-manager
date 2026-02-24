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

export type OrganizationEditFormValues = {
  nombre: string;
  descripcion: string;
  logo_url: string;
  email: string;
  telefono: string;
  web_url: string;
  instagram_url: string;
  facebook_url: string;
  x_url: string;
};

export type OrganizationEditPayload = {
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  email: string;
  telefono: string | null;
  web_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
};

export type OrganizationEditResult = {
  updatedAt: string;
};

export type OrganizationEditField = keyof OrganizationEditFormValues;

export type OrganizationEditFieldErrors = Partial<Record<OrganizationEditField, string>>;
