export type TenantIdentityPayload = {
  tenantId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  foundedAt: string | null;
};

export type TenantContactPayload = {
  email: string | null;
  phone: string | null;
  websiteUrl: string | null;
};

export type TenantSocialPayload = {
  instagramUrl: string | null;
  facebookUrl: string | null;
  xUrl: string | null;
};

export type TenantViewData = {
  identity: TenantIdentityPayload;
  contact: TenantContactPayload;
  social: TenantSocialPayload;
};

export type TenantViewErrorCode =
  | 'UNAUTHENTICATED'
  | 'PROFILE_NOT_FOUND'
  | 'TENANT_NOT_FOUND'
  | 'UNKNOWN';

export type TenantViewError = {
  code: TenantViewErrorCode;
  message: string;
};

export type TenantViewState = {
  data: TenantViewData | null;
  loading: boolean;
  error: string | null;
};

export type TenantEditFormValues = {
  nombre: string;
  descripcion: string;
  logo_url: string;
  email: string;
  telefono: string;
  web_url: string;
  instagram_url: string;
  facebook_url: string;
  x_url: string;
  max_solicitudes: string;
};

export type TenantEditPayload = {
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  email: string;
  telefono: string | null;
  web_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  x_url: string | null;
  max_solicitudes: number;
};

export type TenantEditResult = {
  updatedAt: string;
};

export type TenantEditField = keyof TenantEditFormValues;

export type TenantEditFieldErrors = Partial<Record<TenantEditField, string>>;

export type TenantRole = 'administrador' | 'usuario' | 'entrenador';

export type TenantMembershipWithRole = {
  tenantId: string;
  roleId: string;
  role: TenantRole;
};

export type TenantAccessDecision = {
  tenantId: string;
  allowed: boolean;
  role: TenantRole | null;
};

export type PortalTenantListItem = {
  identity: TenantIdentityPayload;
  canAccess: boolean;
  userMembershipRole: TenantRole | null;
};
