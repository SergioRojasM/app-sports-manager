/** Row returned by the `listar_organizaciones_destacadas` RPC (US-0140). */
export type OrganizacionDestacadaRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  logo_url: string | null;
  banner_url: string | null;
  disciplinas: string[] | null;
  total_atletas: number | null;
};

/** Public organization shown on the app home (US-0140). Only public fields. */
export type OrganizacionDestacada = {
  id: string;
  nombre: string;
  descripcion: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  disciplinas: string[];
  totalAtletas: number;
};
