"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AuthCredentials, AuthResult } from "@/types/auth.types";
import { authService } from "@/services/supabase/auth";
import { portalService } from "@/services/supabase/portal";
import { setPortalCookies } from "@/app/actions/portal.actions";
import { createClient } from "@/services/supabase/client";

type UseAuthState = {
  user: User | null;
  session: Session | null;
  initializing: boolean;
};

export function useAuth() {
  const [state, setState] = useState<UseAuthState>({
    user: null,
    session: null,
    initializing: true,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      setState({
        user: data.session?.user ?? null,
        session: data.session ?? null,
        initializing: false,
      });
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          initializing: false,
        });
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (credentials: AuthCredentials): Promise<AuthResult> => {
      const result = await authService.signInWithPassword(credentials);
      setErrorMessage(result.errorMessage);
      if (!result.errorMessage && result.user?.id) {
        try {
          const profile = await portalService.fetchDisplayProfile(supabase, result.user.id);
          await setPortalCookies('usuario', {
            nombre: profile.nombre,
            apellido: profile.apellido,
            foto_url: profile.foto_url,
            email: profile.email,
          });
        } catch {
          // Non-fatal: layout will fall back to DB query on first load
        }
      }
      return result;
    },
    [supabase]
  );

  const signUp = useCallback(
    async (credentials: AuthCredentials): Promise<AuthResult> => {
      const result = await authService.signUpWithPassword(credentials);
      setErrorMessage(result.errorMessage);
      return result;
    },
    []
  );

  const signOut = useCallback(async () => {
    await setPortalCookies(null);
    const error = await authService.signOut();
    setErrorMessage(error);
    return error;
  }, []);

  return {
    ...state,
    errorMessage,
    signIn,
    signUp,
    signOut,
  };
}
