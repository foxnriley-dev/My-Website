import { z } from 'zod';
import { Timestamp } from './common';

export const UnitSystem = z.enum(['us_customary', 'metric']);
export type UnitSystem = z.infer<typeof UnitSystem>;

export const ThemePreference = z.enum(['system', 'light', 'dark']);
export type ThemePreference = z.infer<typeof ThemePreference>;

export const Preferences = z.object({
  unitSystem: UnitSystem,
  region: z.enum(['US']),
  theme: ThemePreference,
  notifyCaseUpdatesByEmail: z.boolean(),
});
export type Preferences = z.infer<typeof Preferences>;

export const PreferencesUpdateInput = Preferences.partial();
export type PreferencesUpdateInput = z.infer<typeof PreferencesUpdateInput>;

export const PlanTier = z.enum(['free', 'pro']);
export type PlanTier = z.infer<typeof PlanTier>;

export const UsageMeter = z.object({
  used: z.number().int().nonnegative(),
  limit: z.number().int().nonnegative(),
  periodStart: Timestamp,
  periodEnd: Timestamp,
});

export const EntitlementSummary = z.object({
  tier: PlanTier,
  planVersion: z.string(),
  source: z.enum(['default_free', 'web_checkout', 'app_store', 'google_play', 'admin_grant']),
  validUntil: Timestamp.nullable(),
  /** Billing is not live; UI must not show a purchase flow until this is true. */
  billingEnabled: z.boolean(),
  limits: z.object({
    savedMachines: z.number().int(),
    standardRunsPerPeriod: z.number().int(),
    deepRunsPerPeriod: z.number().int(),
    imagesPerRun: z.number().int(),
  }),
  usage: z.object({
    savedMachines: z.number().int(),
    standardRuns: UsageMeter,
    deepRuns: UsageMeter,
  }),
  quotasProvisional: z.boolean(),
});
export type EntitlementSummary = z.infer<typeof EntitlementSummary>;

export const Me = z.object({
  userId: z.uuid(),
  email: z.string().nullable(),
  createdAt: Timestamp,
  preferences: Preferences,
  entitlement: EntitlementSummary,
});
export type Me = z.infer<typeof Me>;

export const AccountDeletionInput = z.object({
  confirm: z.literal('DELETE'),
});
export type AccountDeletionInput = z.infer<typeof AccountDeletionInput>;

export const DeletionResult = z.object({
  deleted: z.literal(true),
  objectsRemoved: z.number().int(),
  notes: z.array(z.string()),
});
export type DeletionResult = z.infer<typeof DeletionResult>;
