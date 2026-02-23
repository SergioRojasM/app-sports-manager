import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/services/supabase/server';
import { portalService } from '@/services/supabase/portal';
import { VALID_ROLES, type PortalDisplayProfile } from '@/types/portal.types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/portal',
  maxAge: 60 * 60 * 24, // 24 hours
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get('next');
  const nextPath = nextParam?.startsWith('/') ? nextParam : '/portal';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/auth/login?next=/portal', request.url));
  }

  try {
    const profile = await portalService.fetchFullProfile(supabase, user.id);

    if (!VALID_ROLES.includes(profile.role)) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const displayProfile: PortalDisplayProfile = {
      nombre: profile.nombre,
      apellido: profile.apellido,
      email: profile.email,
      foto_url: profile.foto_url,
    };

    const response = NextResponse.redirect(new URL(nextPath, request.url));
    response.cookies.set('portal_role', profile.role, COOKIE_OPTIONS);
    response.cookies.set(
      'portal_profile',
      Buffer.from(JSON.stringify(displayProfile)).toString('base64'),
      COOKIE_OPTIONS,
    );

    return response;
  } catch {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}