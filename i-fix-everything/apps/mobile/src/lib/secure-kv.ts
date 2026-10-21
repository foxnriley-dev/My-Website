import * as SecureStore from 'expo-secure-store';

/**
 * Key-value storage backed by the platform's protected credential store
 * (iOS Keychain / Android Keystore-encrypted storage). Values are chunked
 * because a single SecureStore entry should stay under ~2 KB. An index of keys
 * lets sign-out clear everything this app wrote.
 */
const CHUNK = 1800;
const INDEX_KEY = 'ife.index';
const OPTIONS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function readIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(INDEX_KEY, OPTIONS);
  try {
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function writeIndex(keys: string[]): Promise<void> {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify([...new Set(keys)]), OPTIONS);
}

export const secureKV = {
  async getItem(key: string): Promise<string | null> {
    const k = safe(key);
    const countRaw = await SecureStore.getItemAsync(`${k}.n`, OPTIONS);
    if (countRaw === null) return null;
    const n = parseInt(countRaw, 10);
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const part = await SecureStore.getItemAsync(`${k}.${i}`, OPTIONS);
      if (part === null) return null; // partially written value: treat as absent
      parts.push(part);
    }
    return parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const k = safe(key);
    const prevRaw = await SecureStore.getItemAsync(`${k}.n`, OPTIONS);
    const n = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    await SecureStore.setItemAsync(`${k}.n`, String(n), OPTIONS);
    const prev = prevRaw ? parseInt(prevRaw, 10) : 0;
    for (let i = n; i < prev; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, OPTIONS);
    const index = await readIndex();
    if (!index.includes(k)) await writeIndex([...index, k]);
  },

  async removeItem(key: string): Promise<void> {
    const k = safe(key);
    const countRaw = await SecureStore.getItemAsync(`${k}.n`, OPTIONS);
    const n = countRaw ? parseInt(countRaw, 10) : 0;
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, OPTIONS);
    await SecureStore.deleteItemAsync(`${k}.n`, OPTIONS);
    await writeIndex((await readIndex()).filter((x) => x !== k));
  },

  /** Remove every value with a given prefix (or everything when omitted). */
  async clear(prefix = ''): Promise<void> {
    const p = safe(prefix);
    for (const k of await readIndex()) {
      if (k.startsWith(p)) await secureKV.removeItem(k);
    }
  },
};

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await secureKV.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export const writeJson = (key: string, value: unknown) => secureKV.setItem(key, JSON.stringify(value));
