'use client';

/**
 * Device-local drafts (unsent edits) for the web client. Server persistence is
 * the source of truth; this only protects typing against reloads and network
 * loss. Everything here is cleared on sign-out.
 */
const PREFIX = 'ife:';

export function readLocal<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeLocal(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

export function clearAllLocal(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    sessionStorage.clear();
  } catch {
    /* storage unavailable */
  }
}

export function applyTheme(theme: 'system' | 'light' | 'dark'): void {
  try {
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('ife-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('ife-theme', theme);
    }
  } catch {
    /* ignore */
  }
}
