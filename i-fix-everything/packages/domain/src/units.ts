import type { UnitSystem } from '@ife/contracts';

/**
 * Display conversion only. Original source values and units are always stored
 * and shown alongside converted values for critical specifications.
 */
type Conv = { to: string; factor: number; offset?: number };
const TO_US: Record<string, Conv> = {
  'N·m': { to: 'lbf·ft', factor: 0.737562149 },
  mm: { to: 'in', factor: 0.0393700787 },
  cm: { to: 'in', factor: 0.393700787 },
  kPa: { to: 'psi', factor: 0.145037738 },
  bar: { to: 'psi', factor: 14.5037738 },
  L: { to: 'qt', factor: 1.05668821 },
  mL: { to: 'fl oz', factor: 0.0338140227 },
  kg: { to: 'lb', factor: 2.20462262 },
  km: { to: 'mi', factor: 0.621371192 },
  '°C': { to: '°F', factor: 1.8, offset: 32 },
};
const TO_METRIC: Record<string, Conv> = {
  'lbf·ft': { to: 'N·m', factor: 1.35581795 },
  in: { to: 'mm', factor: 25.4 },
  psi: { to: 'kPa', factor: 6.89475729 },
  qt: { to: 'L', factor: 0.946352946 },
  'fl oz': { to: 'mL', factor: 29.5735296 },
  lb: { to: 'kg', factor: 0.45359237 },
  mi: { to: 'km', factor: 1.609344 },
  '°F': { to: '°C', factor: 1 },
};
// °F→°C needs (F-32)/1.8 — handled explicitly below.

export interface ConvertedValue {
  original: { value: number; unit: string };
  display: { value: number; unit: string } | null;
}

export function convertForDisplay(value: number, unit: string, system: UnitSystem, decimals = 1): ConvertedValue {
  const original = { value, unit };
  const table = system === 'us_customary' ? TO_US : TO_METRIC;
  const c = table[unit];
  if (!c) return { original, display: null };
  let v: number;
  if (unit === '°F') v = (value - 32) / 1.8;
  else v = value * c.factor + (c.offset ?? 0);
  const p = 10 ** decimals;
  return { original, display: { value: Math.round(v * p) / p, unit: c.to } };
}
