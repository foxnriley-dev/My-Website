/**
 * Testable invariants from the blueprint (R001–R008) that are enforceable in
 * Milestones 1–2. Later milestones extend this module; see docs/acceptance.md.
 */

/** R005: external URLs must be plain https without credentials, to a public host. */
export function isSafeExternalUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')) return false;
  return host.includes('.');
}

/** R007: a dependent output is stale when the input revision it was built from is no longer current. */
export function isStale(builtFromInputRevision: number, currentInputRevision: number): boolean {
  return builtFromInputRevision !== currentInputRevision;
}

/** Only relative in-app paths may be used as post-auth redirect targets (open-redirect guard). */
export function safeRedirectPath(next: string | null | undefined, fallback = '/app'): string {
  if (!next || typeof next !== 'string') return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (/[\r\n\t]/.test(next)) return fallback;
  return next;
}
