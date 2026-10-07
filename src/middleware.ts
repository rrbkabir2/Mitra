import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MITRA SECURITY GATEWAY - MIDDLEWARE
 * Gates access to the entire admin application and all protected API routes.
 * 
 * Public Routes (Allowed without session):
 * - /login (Admin authentication screen)
 * - /auth/callback (Google OAuth return handler)
 * - /v/:path* (Vendor Token Interface & Proof of Delivery Certificates)
 * - /api/whatsapp/webhook (Meta Cloud API Webhook)
 * - /api/reminders/check (Automated daily cron check)
 * - Static assets (_next, favicon.ico, manifest.json)
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public vendor portal and webhook endpoints
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/v/') ||
    pathname.startsWith('/api/whatsapp/webhook') ||
    pathname.startsWith('/api/reminders/check') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/icons')
  ) {
    return NextResponse.next();
  }

  // 2. Check for active session cookie
  // Supports Supabase session cookies as well as Mitra custom session cookie
  const authCookie =
    request.cookies.get('mitra_auth_session')?.value ||
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb-auth-token')?.value;

  // Look for any Supabase project auth cookies (format: sb-<project-ref>-auth-token)
  const allCookies = request.cookies.getAll();
  const hasSupabaseCookie = allCookies.some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  const isAuthenticated = Boolean(authCookie || hasSupabaseCookie);

  // If trying to access protected API routes without authentication
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to access protected admin API routes.' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // If trying to access admin dashboard or pages without authentication -> Redirect to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
