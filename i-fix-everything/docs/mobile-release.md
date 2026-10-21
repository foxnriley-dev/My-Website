# Mobile release preparation

Nothing has been signed, built in the cloud, submitted or published. Developer accounts and signing keys remain
under the owner's control.

## Identifiers (development placeholders — replace before any store build)
| Variant (`APP_VARIANT`) | iOS bundle id / Android package | URL scheme | App name |
|---|---|---|---|
| development | `dev.placeholder.ifixeverything.dev` | `ifixeverything-dev` | I Fix Everything (Dev) |
| staging | `dev.placeholder.ifixeverything.staging` | `ifixeverything-staging` | I Fix Everything (Beta) |
| production | `dev.placeholder.ifixeverything` | `ifixeverything` | I Fix Everything |

Set `APP_BUNDLE_ID_BASE` (e.g. `com.yourcompany.ifixeverything`) to switch all three. Final ids are an owner decision.

## Build profiles (`apps/mobile/eas.json`)
`development` (dev client, iOS simulator), `development-device`, `staging` (internal distribution), `production`.

## Auth callbacks / deep links
- Each variant uses its own scheme; the exact callback `<scheme>://auth/callback` must be in Supabase Auth's
  redirect allow-list (development is already listed in `supabase/config.toml`).
- Production should add **universal links / app links** for `https://<domain>/auth/callback` (requires the final
  domain, Apple Associated Domains entitlement and an `assetlinks.json`). Not configured.
- Callback handling only allows the `reset-password` destination; codes are exchanged on the device that holds the PKCE verifier.

## Permissions
- iOS: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription` (purpose strings in app.config.ts). Microphone disabled.
- Android: `CAMERA` only. Location, microphone, Bluetooth and broad media read permissions are blocked; the system photo picker needs none.

## Checklists (to complete in Milestone 5)
### TestFlight
- [ ] Apple Developer Program membership; App Store Connect app record; final bundle id
- [ ] Signing via EAS credentials or manual certificates (owner)
- [ ] Production icon/splash artwork (current icons are generated placeholders)
- [ ] Privacy manifest review; App Privacy "nutrition label" answers from actual data flows
- [ ] Reviewer test account + instructions; review backend reachable
- [ ] Account deletion reachable in-app (implemented)
### Google Play testing
- [ ] Play Console account; package name; upload key / Play App Signing
- [ ] Data safety form from actual data flows; content rating; target audience (adults)
- [ ] Internal testing track; tester list
### Public submissions
- [ ] Re-verify current Apple Review Guidelines and Google Play Payments policy for the actual feature set
- [ ] Screenshots from real builds only; support URL; privacy policy URL (final, counsel-reviewed)
- [ ] Store purchase flows (Milestone 5) consistent with approved price and policies

## Backward compatibility
Installed apps send `x-ife-client: <platform>/<version>`; the server returns `426 client_outdated` below
`MIN_CLIENT_VERSION_IOS/ANDROID`. Responses are validated against `@ife/contracts` on the client, which strips
unknown fields, so additive server changes are safe. Breaking changes require a new API version path.
