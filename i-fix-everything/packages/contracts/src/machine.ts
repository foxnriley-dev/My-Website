import { z } from 'zod';
import { Id, Timestamp } from './common';

export const MachineCategory = z.enum([
  'car',
  'motorcycle',
  'go_kart',
  'mini_bike',
  'motorized_bicycle',
  'small_engine',
  'other',
]);
export type MachineCategory = z.infer<typeof MachineCategory>;

export const MACHINE_CATEGORY_LABELS: Record<MachineCategory, string> = {
  car: 'Car or light truck',
  motorcycle: 'Motorcycle or scooter',
  go_kart: 'Go kart',
  mini_bike: 'Mini bike',
  motorized_bicycle: 'Motorized bicycle or e-bike',
  small_engine: 'Small engine equipment',
  other: 'Something else',
};

export const PowerType = z.enum([
  'gasoline_4_stroke',
  'gasoline_2_stroke',
  'diesel',
  'electric',
  'hybrid',
  'other',
]);
export type PowerType = z.infer<typeof PowerType>;

/**
 * Where a value came from. Only `user_entered` is produced in Milestones 1–2;
 * the others are reserved for OCR, VIN decoding, catalog matching and review.
 */
export const Provenance = z.enum([
  'user_entered',
  'ocr_extracted',
  'decoder_supplied',
  'catalog_matched',
  'reviewer_confirmed',
]);
export type Provenance = z.infer<typeof Provenance>;

export const FieldState = z.enum(['known', 'unknown', 'not_applicable']);
export type FieldState = z.infer<typeof FieldState>;

export const IdentityField = z
  .object({
    state: FieldState,
    value: z.string().trim().min(1).max(120).nullable(),
    provenance: Provenance.nullable(),
    /** Machine-read values (OCR, decoder) stay `needs_confirmation` until the owner confirms. */
    confirmation: z.enum(['confirmed', 'needs_confirmation']),
  })
  .refine((f) => (f.state === 'known' ? f.value !== null && f.provenance !== null : f.value === null), {
    message: 'Known fields need a value and provenance; unknown fields must not carry a value',
  });
export type IdentityField = z.infer<typeof IdentityField>;

export const IDENTITY_FIELD_KEYS = [
  'make',
  'model',
  'year',
  'market',
  'variant',
  'powerType',
  'engineIdentifier',
  'serialOrVin',
] as const;
export type IdentityFieldKey = (typeof IDENTITY_FIELD_KEYS)[number];

export const IDENTITY_FIELD_LABELS: Record<IdentityFieldKey, string> = {
  make: 'Make',
  model: 'Model',
  year: 'Year',
  market: 'Market or region',
  variant: 'Trim or variant',
  powerType: 'Fuel or power type',
  engineIdentifier: 'Engine or motor ID',
  serialOrVin: 'Serial number or VIN',
};

export const MachineIdentity = z.object(
  Object.fromEntries(IDENTITY_FIELD_KEYS.map((k) => [k, IdentityField])) as Record<
    IdentityFieldKey,
    typeof IdentityField
  >,
);
export type MachineIdentity = z.infer<typeof MachineIdentity>;

export const ComponentKind = z.enum([
  'engine',
  'motor',
  'battery',
  'controller',
  'carburetor',
  'fuel_system',
  'ignition',
  'transmission',
  'drivetrain',
  'brakes',
  'other',
]);
export type ComponentKind = z.infer<typeof ComponentKind>;

export const InstalledComponent = z.object({
  id: Id,
  kind: ComponentKind,
  make: z.string().trim().max(120).nullable(),
  model: z.string().trim().max(120).nullable(),
  identifier: z.string().trim().max(120).nullable(),
  /** True when this differs from what the machine shipped with (e.g. engine swap). */
  replacesFactory: z.boolean(),
  notes: z.string().trim().max(1000).nullable(),
  provenance: Provenance,
});
export type InstalledComponent = z.infer<typeof InstalledComponent>;

export const Modification = z.object({
  id: Id,
  description: z.string().trim().min(1).max(1000),
  provenance: Provenance,
});
export type Modification = z.infer<typeof Modification>;

/** Everything about a machine that affects compatibility or diagnosis. Changing it creates a revision. */
export const MachineIdentityInput = z.object({
  identity: MachineIdentity,
  installedComponents: z.array(InstalledComponent).max(30),
  modifications: z.array(Modification).max(50),
});
export type MachineIdentityInput = z.infer<typeof MachineIdentityInput>;

export const MachineCreateInput = MachineIdentityInput.extend({
  idempotencyKey: Id,
  category: MachineCategory,
  nickname: z.string().trim().min(1).max(80),
});
export type MachineCreateInput = z.infer<typeof MachineCreateInput>;

export const MachineUpdateInput = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  archived: z.boolean().optional(),
});
export type MachineUpdateInput = z.infer<typeof MachineUpdateInput>;

export const MachineRevisionCreateInput = MachineIdentityInput.extend({
  /** Optimistic concurrency: the revision number the client edited from. */
  expectedRevision: z.number().int().positive(),
  changeNote: z.string().trim().max(500).nullable(),
});
export type MachineRevisionCreateInput = z.infer<typeof MachineRevisionCreateInput>;

export const MachineRevision = MachineIdentityInput.extend({
  id: Id,
  machineId: Id,
  revision: z.number().int().positive(),
  changeNote: z.string().nullable(),
  changedFields: z.array(z.string()),
  createdAt: Timestamp,
});
export type MachineRevision = z.infer<typeof MachineRevision>;

export const IdentityCompleteness = z.object({
  known: z.number().int(),
  relevant: z.number().int(),
  missingKeyFields: z.array(z.string()),
  needsConfirmation: z.array(z.string()),
});
export type IdentityCompleteness = z.infer<typeof IdentityCompleteness>;

export const Machine = z.object({
  id: Id,
  category: MachineCategory,
  nickname: z.string(),
  archivedAt: Timestamp.nullable(),
  createdAt: Timestamp,
  updatedAt: Timestamp,
  currentRevision: MachineRevision,
  completeness: IdentityCompleteness,
  openCaseCount: z.number().int(),
});
export type Machine = z.infer<typeof Machine>;

export const POWER_TYPE_LABELS: Record<PowerType, string> = {
  gasoline_4_stroke: 'Gasoline, 4-stroke',
  gasoline_2_stroke: 'Gasoline, 2-stroke (mixed fuel)',
  diesel: 'Diesel',
  electric: 'Electric (battery)',
  hybrid: 'Hybrid',
  other: 'Other',
};

export const COMPONENT_KIND_LABELS: Record<ComponentKind, string> = {
  engine: 'Engine',
  motor: 'Electric motor',
  battery: 'Battery',
  controller: 'Motor controller',
  carburetor: 'Carburetor',
  fuel_system: 'Fuel system',
  ignition: 'Ignition',
  transmission: 'Transmission or clutch',
  drivetrain: 'Chain, belt or drivetrain',
  brakes: 'Brakes',
  other: 'Other part',
};
