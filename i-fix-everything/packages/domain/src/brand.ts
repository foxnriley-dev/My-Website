/**
 * Single branding module. Consumer copy must use these values, never literals,
 * so the name can change in one place. No trademark, domain or store-name
 * availability check is implied by this configuration.
 */
export const BRAND = {
  productName: 'I Fix Everything',
  proTierName: 'I Fix Everything Pro',
  shortName: 'I Fix Everything',
  tagline: 'A repair companion for engines, motors and the machines around them.',
  /** Honest scope line; the name is not a promise to diagnose or repair every machine. */
  scopeNote:
    'Helps you narrow down problems and plan repairs on cars, motorcycles, go karts, mini bikes, motorized bicycles and small engine equipment. It does not replace a qualified mechanic.',
  supportEmailPlaceholder: 'support@example.invalid',
  locale: 'en-US',
  currency: 'USD',
} as const;
