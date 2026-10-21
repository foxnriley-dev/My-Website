// Server-only module guard. Native and browser bundles must never include this
// package (it handles database credentials and the storage secret key).
const g = globalThis as { window?: unknown; navigator?: { product?: string } };
if (typeof g.window !== 'undefined' || g.navigator?.product === 'ReactNative') {
  throw new Error('@ife/server is server-only and must not be bundled into a client.');
}
export {};
