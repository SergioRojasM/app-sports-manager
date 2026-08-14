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

  async signUpWithPassword(credentials: AuthCredentials, next?: string): Promise<AuthResult> {
    const supabase = createClient();
    const emailRedirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        emailRedirectTo,
      },
    });

    return {
      user: data.user,
      session: data.session,
      errorMessage: error ? error.message : null,
    };
  },

  async signInWithOAuth(next?: string): Promise<{ errorMessage: string | null }> {
    const supabase = createClient();
    const redirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    return { errorMessage: error ? error.message : null };
  },

  async signOut(): Promise<string | null> {
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    return error ? error.message : null;
  },

  async resetPasswordForEmail(email: string): Promise<{ errorMessage: string | null }> {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    });
    return { errorMessage: error ? error.message : null };
  },

  async updatePassword(password: string): Promise<{ errorMessage: string | null }> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    return { errorMessage: error ? error.message : null };
  },
};
