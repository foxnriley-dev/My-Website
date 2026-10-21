# Platform parity

Consumer features × platform, with **actual** verification status. "Implemented" means the code exists and
typechecks/bundles; "Verified" names what actually ran. No row is verified on an iOS simulator, Android
emulator or physical device yet — none is available in the build container.

| Feature | Web | iOS | Android | Verification |
|---|---|---|---|---|
| Public home with honest scope + labeled sample | Implemented | n/a (web only) | n/a | Playwright desktop + Pixel 7 emulation |
| Sign up with invite code | Implemented | Implemented | Implemented | Web: Playwright (rejected code; valid code → email confirmation). Native screen: not run |
| Sign in / sign out | Implemented | Implemented | Implemented | Web: Playwright. Native: jest (error message); sign-out clearing: jest |
| Password recovery + callback | Implemented (`/auth/callback`, `/reset-password`) | Implemented (`ifixeverything-dev://auth/callback`) | Implemented | Web: Playwright via Mailpit (confirmation + recovery). Native: not run |
| Session restore / refresh | Cookie + proxy refresh | SecureStore (Keychain), auto-refresh in foreground | SecureStore (Keystore) | Web: Playwright reload/new tab. Native: storage chunking in jest |
| Revoked session blocked | Server-side | Server-side | Server-side | Integration (any client) |
| Garage list / add / edit (revision) / archive | Implemented | Implemented | Implemented | Web: Playwright + integration. Native: typecheck + bundle only |
| Machine revision conflict handling | Implemented | Implemented | Implemented | Integration (ios vs android clients) |
| Start repair, intake wizard | Implemented | Implemented | Implemented | Web: Playwright. Native: bundle only |
| Draft persistence (device) | localStorage, cleared on sign-out | SecureStore, cleared on sign-out | SecureStore | Web: Playwright. Native: jest |
| Cross-device intake conflict | Implemented | Implemented (shared hook) | Implemented | Playwright (two contexts) + jest + integration |
| Safety questions + holds | Implemented | Implemented | Implemented | Domain + integration; Playwright |
| Take photo | `<input capture>` | expo-image-picker camera | expo-image-picker camera | Web: not automatable headless (file path tested). Native: not run |
| Choose photos (system picker, limited access) | File picker | PHPicker (no permission) | Android photo picker | Web: Playwright. Native: not run |
| Camera denied fallback | Picker always offered | "Choose from library" + Open Settings | same | Native: jest |
| On-device HEIC→JPEG, metadata drop | n/a (server handles) | expo-image-manipulator | expo-image-manipulator | Not run |
| Independent upload retry | Implemented | Implemented (persisted manifest) | Implemented | Integration + jest |
| Upload resume after app kill / foreground | n/a (select again) | Implemented | Implemented | jest (logic). Maestro flow written, not run |
| Photo list, reorder, role, remove | Implemented | Implemented | Implemented | Integration + Playwright (web) |
| Job status / polling | Polls while active | Polls + refetch on foreground | same | Integration (real queue) |
| Case workspace tabs (Overview/Evidence/Troubleshooting/Parts/Guide) | Implemented | Implemented (segmented) | Implemented | Web: Playwright |
| Case archive / delete | Implemented | Implemented | Implemented | Integration |
| Account: units, theme, notifications | Implemented | Implemented | Implemented | Web: build/typecheck; API: integration |
| Plan + usage display (no purchase) | Implemented | Implemented | Implemented | Integration (`/me`) |
| Data export | JSON download | Share sheet (explicit user action) | Share sheet | Integration |
| Account deletion | Implemented | Implemented | Implemented | Integration |
| Outdated-app handling | n/a | `client_outdated` (426) | same | Integration |
| Offline indicator | Banner | Query online manager (NetInfo) | same | Not run on device |
| Dark/light/system theme | Implemented | Implemented | Implemented | Web visual not screenshot-tested |
| Screen reader semantics | Landmarks, labels, skip link | roles/states on controls | same | Web: keyboard Playwright test. Native: jest checks radio role/state only |
