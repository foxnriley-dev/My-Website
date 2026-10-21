import {
  IDENTITY_FIELD_KEYS,
  IDENTITY_FIELD_LABELS,
  type IdentityCompleteness,
  type IdentityField,
  type IdentityFieldKey,
  type MachineCategory,
  type MachineIdentity,
  type MachineIdentityInput,
} from '@ife/contracts';

export const UNKNOWN_FIELD: IdentityField = Object.freeze({
  state: 'unknown',
  value: null,
  provenance: null,
  confirmation: 'confirmed',
}) as IdentityField;

export function emptyIdentity(): MachineIdentity {
  return Object.fromEntries(IDENTITY_FIELD_KEYS.map((k) => [k, { ...UNKNOWN_FIELD }])) as MachineIdentity;
}

export function userField(value: string | null | undefined): IdentityField {
  const v = value?.trim();
  if (!v) return { ...UNKNOWN_FIELD };
  return { state: 'known', value: v, provenance: 'user_entered', confirmation: 'confirmed' };
}

/**
 * Fields that matter for identification per category. Small-engine equipment is
 * identified by the engine label (model/type/code), not a VIN; e-bikes by motor
 * and battery components; cars by VIN plus make/model/year/engine.
 */
export const RELEVANT_FIELDS: Record<MachineCategory, IdentityFieldKey[]> = {
  car: ['make', 'model', 'year', 'variant', 'powerType', 'engineIdentifier', 'serialOrVin'],
  motorcycle: ['make', 'model', 'year', 'powerType', 'engineIdentifier', 'serialOrVin'],
  go_kart: ['make', 'model', 'powerType', 'engineIdentifier'],
  mini_bike: ['make', 'model', 'powerType', 'engineIdentifier'],
  motorized_bicycle: ['make', 'model', 'powerType', 'engineIdentifier'],
  small_engine: ['make', 'model', 'powerType', 'engineIdentifier', 'serialOrVin'],
  other: ['make', 'model', 'powerType'],
};

/** The few fields we ask for first because identification depends on them most. */
const KEY_FIELDS: Record<MachineCategory, IdentityFieldKey[]> = {
  car: ['make', 'model', 'year', 'engineIdentifier'],
  motorcycle: ['make', 'model', 'year'],
  go_kart: ['engineIdentifier', 'powerType'],
  mini_bike: ['engineIdentifier', 'powerType'],
  motorized_bicycle: ['powerType', 'engineIdentifier'],
  small_engine: ['make', 'engineIdentifier'],
  other: ['make', 'powerType'],
};

export function identityCompleteness(category: MachineCategory, identity: MachineIdentity): IdentityCompleteness {
  const relevant = RELEVANT_FIELDS[category];
  const known = relevant.filter((k) => identity[k].state === 'known').length;
  return {
    known,
    relevant: relevant.length,
    missingKeyFields: KEY_FIELDS[category]
      .filter((k) => identity[k].state === 'unknown')
      .map((k) => IDENTITY_FIELD_LABELS[k]),
    needsConfirmation: IDENTITY_FIELD_KEYS.filter((k) => identity[k].confirmation === 'needs_confirmation').map(
      (k) => IDENTITY_FIELD_LABELS[k],
    ),
  };
}

/** Key-order-independent JSON (Postgres jsonb does not preserve key order). */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/** Field-level diff used to label revisions and decide what becomes stale. */
export function diffIdentity(prev: MachineIdentityInput, next: MachineIdentityInput): string[] {
  const changed: string[] = [];
  for (const k of IDENTITY_FIELD_KEYS) {
    const a = prev.identity[k];
    const b = next.identity[k];
    if (a.state !== b.state || a.value !== b.value || a.provenance !== b.provenance || a.confirmation !== b.confirmation) {
      changed.push(k);
    }
  }
  if (stableStringify(prev.installedComponents) !== stableStringify(next.installedComponents)) changed.push('installedComponents');
  if (stableStringify(prev.modifications) !== stableStringify(next.modifications)) changed.push('modifications');
  return changed;
}

export function machineTitle(
  nickname: string,
  identity: Pick<MachineIdentity, 'make' | 'model' | 'year'>,
): { title: string; subtitle: string | null } {
  const parts = [identity.year, identity.make, identity.model]
    .filter((f) => f.state === 'known' && f.value)
    .map((f) => f.value as string);
  return { title: nickname, subtitle: parts.length ? parts.join(' ') : null };
}
