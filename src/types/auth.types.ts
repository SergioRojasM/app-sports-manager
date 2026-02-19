import type { Session, User } from "@supabase/supabase-js";

export type AuthCredentials = {
  email: string;
  password: string;
};

export type AuthResult = {
  user: User | null;
  session: Session | null;
  errorMessage: string | null;
};
