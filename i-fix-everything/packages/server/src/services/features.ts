import type { FeatureSwitches } from '@ife/domain';
import { getSql } from '../db';

export interface AllSwitches extends FeatureSwitches {
  deepDiagnostic: boolean;
  billing: boolean;
  inviteRequired: boolean;
}

let cache: { at: number; value: AllSwitches } | null = null;
const TTL_MS = 15_000;

/** Kill switches and runtime settings, read with system privileges and cached briefly. */
export async function featureSwitches(): Promise<AllSwitches> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  const sql = getSql();
  const rows = await sql<{ key: string; enabled: boolean }[]>`select key, enabled from app.feature_switches`;
  const settings = await sql<{ key: string; value: unknown }[]>`select key, value from app.runtime_settings`;
  const on = (k: string) => rows.find((r) => r.key === k)?.enabled ?? false;
  const value: AllSwitches = {
    assessment: on('assessment'),
    parts: on('parts'),
    videos: on('videos'),
    guides: on('guides'),
    deepDiagnostic: on('deep_diagnostic'),
    billing: on('billing'),
    inviteRequired: settings.find((s) => s.key === 'invite_required')?.value !== false,
  };
  cache = { at: Date.now(), value };
  return value;
}

export function clearFeatureCache(): void {
  cache = null;
}
