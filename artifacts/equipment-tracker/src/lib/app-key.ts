/**
 * App access key management.
 *
 * The API server requires a shared key (APP_API_KEY on the server) for all
 * non-public routes. The key is stored in localStorage on this device and
 * sent as a Bearer token with every API request.
 */

const STORAGE_KEY = "fieldtrack_app_key";

export function getAppKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAppKey(key: string | null): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode) — key just won't persist
  }
}

/** Headers to attach to hand-rolled fetch() calls against our API. */
export function authHeaders(): Record<string, string> {
  const key = getAppKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}
