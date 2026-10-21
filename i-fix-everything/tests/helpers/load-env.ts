import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(import.meta.dirname, '../../.env.local');
if (!existsSync(file)) {
  throw new Error('Integration tests need a running local stack: run `pnpm db:start && pnpm env:local` first.');
}
process.loadEnvFile(file);
