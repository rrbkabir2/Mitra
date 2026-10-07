/**
 * MITRA DELIVERY CONFIRMATION PLATFORM - ADMIN ACCESS ALLOW-LIST & AUTH UTILITIES
 * 
 * Strict Security Policy:
 * 1. Zero public self-serve registration anywhere in the application.
 * 2. Only pre-approved admin accounts on the allow-list may authenticate.
 * 3. Any unauthorized email (including non-allowlisted Google accounts) is strictly rejected.
 */

export const ADMIN_ALLOWLIST: string[] = [
  'rrbkabir2@gmail.com',
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? [process.env.NEXT_PUBLIC_ADMIN_EMAIL] : []),
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : []),
].map((e) => e.trim().toLowerCase());

/**
 * Validates if an email is on the pre-approved admin allow-list
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ADMIN_ALLOWLIST.includes(normalized);
}

export const MITRA_AUTH_COOKIE_NAME = 'mitra_auth_session';

/**
 * Client-side session cookie helpers
 */
export function setClientAuthCookie(email: string) {
  if (typeof document === 'undefined') return;
  const expiryDays = 7;
  const date = new Date();
  date.setTime(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${MITRA_AUTH_COOKIE_NAME}=${encodeURIComponent(email)}; ${expires}; path=/; SameSite=Lax`;
}

export function clearClientAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${MITRA_AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

export function getClientAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const name = `${MITRA_AUTH_COOKIE_NAME}=`;
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return null;
}
