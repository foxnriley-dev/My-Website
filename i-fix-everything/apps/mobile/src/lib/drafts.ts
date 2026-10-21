import type { DraftStorage } from '@ife/api-client/react';
import { secureKV } from './secure-kv';

/** Native adapter: intake drafts live in the protected credential store and are cleared on sign-out. */
export const nativeDraftStorage: DraftStorage = {
  read: (key) => secureKV.getItem(key),
  write: (key, value) => secureKV.setItem(key, value),
  remove: (key) => secureKV.removeItem(key),
};
