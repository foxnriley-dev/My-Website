# Native UI flows (Maestro)

These flows exercise the same primary journey as the web Playwright suite on a
real iOS simulator / Android emulator or device with a **development build**.
They have NOT been run yet: the build container has no simulator, emulator or
device (see docs/platform-parity.md for verification status).

Prerequisites: local stack running (`pnpm db:start`, `pnpm dev:web`, `pnpm dev:worker`),
a development build installed (`eas build --profile development` or `npx expo run:ios|android`),
and a test account created with `node scripts/create-test-user.mjs` (prints email/password).

```sh
maestro test -e EMAIL=... -e PASSWORD=... apps/mobile/maestro/
```
