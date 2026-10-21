import { RepairCase, type CaseIntake } from '@ife/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, NetworkError } from './index';
import { useSaveIntake } from './react';

/** Device-local draft persistence. Web: localStorage. Native: platform secure storage. */
export interface DraftStorage {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string) => Promise<void>;
  remove: (key: string) => Promise<void>;
}

export type SaveState =
  | { kind: 'saved'; at: string }
  | { kind: 'local' } // kept on this device, not yet on the server
  | { kind: 'saving' }
  | { kind: 'offline' }
  | { kind: 'error'; message: string }
  | { kind: 'conflict'; server: RepairCase };

interface LocalDraft {
  intake: CaseIntake;
  baseVersion: number;
  savedAt: string;
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Intake editing shared by web, iOS and Android. Two persistence levels are
 * shown to the user: "saved on this device" and "saved to your account". A save
 * that loses a race with another device returns a conflict the user resolves;
 * nothing is silently overwritten and typed text is never dropped.
 */
export function useIntakeDraft(storage: DraftStorage, userId: string | null, kase: RepairCase, autosaveMs = 1500) {
  const key = `drafts.${userId ?? 'anon'}.${kase.id}`;
  const save = useSaveIntake(kase.id);
  const versionRef = useRef(kase.version);
  const [value, setValueState] = useState<CaseIntake>(kase.intake);
  const latest = useRef(value);
  const [state, setState] = useState<SaveState>({ kind: 'saved', at: kase.intakeUpdatedAt });
  const stateRef = useRef(state);
  stateRef.current = state;
  const mine = useRef<CaseIntake | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Restore an unsent local draft (e.g. after a reload, app kill or offline period).
  useEffect(() => {
    let cancelled = false;
    void storage.read(key).then((raw) => {
      if (cancelled) return;
      const local = raw ? (JSON.parse(raw) as LocalDraft) : null;
      if (local && stable(local.intake) !== stable(kase.intake)) {
        if (local.baseVersion === kase.version) {
          setValueState(local.intake);
          latest.current = local.intake;
          setState({ kind: 'local' });
        } else {
          mine.current = local.intake;
          setState({ kind: 'conflict', server: kase });
        }
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
    // Only on first mount for this case/user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** Returns the server version after saving, or null if not saved. */
  const flush = useCallback(
    async (version = versionRef.current): Promise<number | null> => {
      if (timer.current) clearTimeout(timer.current);
      const intake = latest.current;
      setState({ kind: 'saving' });
      try {
        const updated = await save.mutateAsync({ ...intake, expectedVersion: version });
        versionRef.current = updated.version;
        if (stable(latest.current) === stable(intake)) {
          await storage.remove(key);
          setState({ kind: 'saved', at: updated.intakeUpdatedAt });
        } else {
          setState({ kind: 'local' });
        }
        return updated.version;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'conflict') {
          const server = RepairCase.safeParse(err.current);
          if (server.success) {
            mine.current = intake;
            setState({ kind: 'conflict', server: server.data });
            return null;
          }
        }
        setState(err instanceof NetworkError ? { kind: 'offline' } : { kind: 'error', message: err instanceof Error ? err.message : 'Not saved' });
        return null;
      }
    },
    [key, save, storage],
  );

  const setValue = useCallback(
    (next: CaseIntake) => {
      setValueState(next);
      latest.current = next;
      void storage.write(key, JSON.stringify({ intake: next, baseVersion: versionRef.current, savedAt: new Date().toISOString() } satisfies LocalDraft));
      setState((s) => (s.kind === 'conflict' ? s : { kind: 'local' }));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (stateRef.current.kind !== 'conflict') void flush();
      }, autosaveMs);
    },
    [autosaveMs, flush, key, storage],
  );

  // Adopt server-side changes made elsewhere when nothing local is pending.
  // Only ever move forward: a stale (older) copy must never replace newer text.
  useEffect(() => {
    if (loaded && stateRef.current.kind === 'saved' && kase.version > versionRef.current) {
      versionRef.current = kase.version;
      setValueState(kase.intake);
      latest.current = kase.intake;
    }
  }, [kase.version, kase.intake, loaded]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const resolve = useCallback(
    async (choice: 'mine' | 'theirs') => {
      const s = stateRef.current;
      if (s.kind !== 'conflict') return;
      versionRef.current = s.server.version;
      if (choice === 'theirs') {
        setValueState(s.server.intake);
        latest.current = s.server.intake;
        mine.current = null;
        await storage.remove(key);
        setState({ kind: 'saved', at: s.server.intakeUpdatedAt });
      } else {
        const keep = mine.current ?? latest.current;
        setValueState(keep);
        latest.current = keep;
        mine.current = null;
        await flush(s.server.version);
      }
    },
    [flush, key, storage],
  );

  return { value, setValue, state, flush, resolve, mine: mine.current, version: () => versionRef.current, loaded };
}
