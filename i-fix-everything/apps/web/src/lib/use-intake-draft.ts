'use client';

import { useIntakeDraft as useSharedIntakeDraft, type DraftStorage } from '@ife/api-client/react';
import type { RepairCase } from '@ife/contracts';
import { readLocal, removeLocal, writeLocal } from './local-store';

export type { SaveState } from '@ife/api-client/react';

/** Web adapter: drafts live in localStorage (cleared on sign-out). */
const webDraftStorage: DraftStorage = {
  read: async (key) => {
    const v = readLocal<unknown>(key);
    return v === null ? null : JSON.stringify(v);
  },
  write: async (key, value) => {
    writeLocal(key, JSON.parse(value));
  },
  remove: async (key) => removeLocal(key),
};

export function useIntakeDraft(userId: string | null, kase: RepairCase) {
  return useSharedIntakeDraft(webDraftStorage, userId, kase);
}
