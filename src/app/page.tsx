import type { Metadata } from 'next';
import { HomePage } from '@/components/home';
import { createClient } from '@/services/supabase/server';

export const metadata: Metadata = {
  title: 'GRIT Arena — Eventos y clubes deportivos',
  description: 'Descubre eventos deportivos, entrena con tu club y gestiona tus entradas en GRIT Arena.',
};

async function readIsAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return Boolean(data.user);
  } catch (error) {
    // The home is public: a session read failure just renders the anonymous variant
    console.error('Home: failed to read the session', error);
    return false;
  }
}

/** Public app home (US-0140). No redirect: anonymous and signed-in users both land here. */
export default async function Home() {
  const isAuthenticated = await readIsAuthenticated();
  return <HomePage isAuthenticated={isAuthenticated} />;
}
