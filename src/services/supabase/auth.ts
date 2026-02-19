import type { AuthCredentials, AuthResult } from "@/types/auth.types";
import { createClient } from "@/services/supabase/client";

export const authService = {
  async signInWithPassword(credentials: AuthCredentials): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    return {
      user: data.user,
      session: data.session,
      errorMessage: error ? error.message : null,
    };
  },

  async signUpWithPassword(credentials: AuthCredentials): Promise<AuthResult> {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    return {
      user: data.user,
      session: data.session,
      errorMessage: error ? error.message : null,
    };
  },

  async signOut(): Promise<string | null> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return error ? error.message : null;
  },
};
