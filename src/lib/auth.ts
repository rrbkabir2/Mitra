/**
 * MITRA DELIVERY CONFIRMATION PLATFORM - ADMIN ACCESS ALLOW-LIST & AUTH UTILITIES
 * 
 * Strict Security Policy:
 * 1. Zero public self-serve registration anywhere in the application.
 * 2. Only pre-approved admin accounts on the allow-list may authenticate.
 * 3. Any unauthorized email (including non-allowlisted Google accounts) is strictly rejected.
 */

const envAllowed = (process.env.ALLOWED_ADMIN_EMAILS || process.env.NEXT_PUBLIC_ALLOWED_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const ADMIN_ALLOWLIST: string[] = Array.from(new Set([
  'rrbkabir2@gmail.com',
  ...envAllowed,
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? [process.env.NEXT_PUBLIC_ADMIN_EMAIL.trim().toLowerCase()] : []),
  ...(process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL.trim().toLowerCase()] : []),
]));

let dynamicAllowedEmails: string[] = [];

export function registerAllowedEmail(email: string) {
  if (email && !dynamicAllowedEmails.includes(email.trim().toLowerCase())) {
    dynamicAllowedEmails.push(email.trim().toLowerCase());
  }
}

export function setDynamicAllowedEmails(emails: string[]) {
  dynamicAllowedEmails = emails.map((e) => e.trim().toLowerCase());
}

/**
 * Validates if an email is on the pre-approved admin allow-list
 */
export function isEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  let normalized = email.trim().toLowerCase();
  try {
    normalized = decodeURIComponent(normalized);
  } catch {}
  return ADMIN_ALLOWLIST.includes(normalized) || dynamicAllowedEmails.includes(normalized);
}

export const MITRA_AUTH_COOKIE_NAME = 'mitra_auth_session';
export const WEB_SESSION_ACTIVE_KEY = 'mitra_web_session_active';
export const WEB_SESSION_LAST_ACTIVE_KEY = 'mitra_web_last_active';
export const WEB_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes inactivity expiry

/**
 * Checks if the application is running in an installed mobile app or PWA standalone window.
 * Requirement 21: Installed Android APK / PWA is a trusted personal environment that may stay
 * logged in longer, whereas standard web browsers must expire upon close or inactivity.
 */
export function isInstalledMobileOrPWA(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroidApp =
      document.referrer?.startsWith('android-app://') ||
      window.location.search.includes('platform=pwa') ||
      window.location.search.includes('standalone=true') ||
      localStorage.getItem('mitra_pwa_mode') === 'true';
    return Boolean(isStandalone || isIOSStandalone || isAndroidApp);
  } catch {
    return false;
  }
}

/**
 * Client-side session cookie helpers
 * On Web: Sets a true session cookie (no expires/Max-Age) + sessionStorage token,
 * so closing Chrome/browser tab or 60 min inactivity terminates the session.
 * On Installed Mobile / PWA: Sets a persistent 30-day cookie for typical mobile app persistence.
 */
export function setClientAuthCookie(email: string, forcePersistent?: boolean) {
  if (typeof document === 'undefined') return;

  const isTrustedApp = isInstalledMobileOrPWA() || forcePersistent;

  if (isTrustedApp) {
    // 30 days persistent cookie for trusted mobile device
    const expiryDays = 30;
    const date = new Date();
    date.setTime(date.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${MITRA_AUTH_COOKIE_NAME}=${encodeURIComponent(email)}; ${expires}; path=/; SameSite=Lax`;
  } else {
    // Session cookie: omitted expires & max-age forces browser to discard cookie on session close
    document.cookie = `${MITRA_AUTH_COOKIE_NAME}=${encodeURIComponent(email)}; path=/; SameSite=Lax`;
    
    // Scoped to active browser tab/window; cleared instantly when tab or browser is fully closed
    try {
      sessionStorage.setItem(WEB_SESSION_ACTIVE_KEY, 'true');
      sessionStorage.setItem(WEB_SESSION_LAST_ACTIVE_KEY, Date.now().toString());
    } catch {}
  }
}

/**
 * Validates whether the active web session is still fresh and unexpired.
 * Returns false if the browser was closed/reopened or if inactivity exceeded 60 minutes.
 */
export function isWebSessionValid(): boolean {
  if (typeof window === 'undefined') return true;
  if (isInstalledMobileOrPWA()) return true; // Installed PWA bypasses strict web session expiry

  try {
    const isActive = sessionStorage.getItem(WEB_SESSION_ACTIVE_KEY);
    if (!isActive) return false; // Tab / browser was closed

    const lastActiveStr = sessionStorage.getItem(WEB_SESSION_LAST_ACTIVE_KEY);
    if (!lastActiveStr) return false;

    const lastActive = parseInt(lastActiveStr, 10);
    if (isNaN(lastActive) || Date.now() - lastActive > WEB_INACTIVITY_TIMEOUT_MS) {
      return false; // Timed out due to inactivity
    }

    return true;
  } catch {
    return true;
  }
}

let lastTouchTime = 0;
/**
 * Throttled activity heartbeat updater for web sessions
 */
export function touchUserActivity() {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastTouchTime < 15000) return; // Update at most once every 15 seconds
  lastTouchTime = now;
  try {
    sessionStorage.setItem(WEB_SESSION_LAST_ACTIVE_KEY, now.toString());
  } catch {}
}

export function clearClientAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${MITRA_AUTH_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  try {
    sessionStorage.removeItem(WEB_SESSION_ACTIVE_KEY);
    sessionStorage.removeItem(WEB_SESSION_LAST_ACTIVE_KEY);
  } catch {}
}

export function getClientAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const name = `${MITRA_AUTH_COOKIE_NAME}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      const c = ca[i].trim();
      if (c.indexOf(name) === 0) {
        const raw = c.substring(name.length);
        try {
          return decodeURIComponent(raw);
        } catch {
          return raw;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
