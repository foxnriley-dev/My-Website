# Product scope

## Confirmed defaults (owner decisions — do not re-ask)
- **Name:** I Fix Everything (exact capitalization; configured once in `packages/domain/src/brand.ts`). Paid tier: **I Fix Everything Pro**. No trademark/domain/store-name check implied.
- **Platforms:** responsive website + native iOS + native Android in the initial release; one account, garage, cases and evidence across all three.
- **Pro price:** USD 14.99/month approved as the starting price. Allowances are provisional pending cost measurement.
- **Business model:** Free + Pro subscription. Live charges disabled until launch approval; sandbox purchasing in Milestone 5.
- **Market:** US English, USD; US customary or metric display while preserving source units.
- **Users:** adult DIY owners and hobbyists (signup copy states 18+).
- **Beta:** invite-only, preceding public Free + Pro release.
- **Privacy:** machine records, symptoms, photos, repair histories and exports private by default.
- **Branding:** standalone; no Visible Valley branding.

## Supported in this build (Milestones 1–2)
- Accounts: sign up (invite), sign in, sign out, password recovery, session restore; web cookies / native secure store.
- Garage: machines with per-field known/unknown state and provenance, installed components (e.g. engine swaps), modifications, immutable revision history, archive/restore, Free/Pro active-machine limit.
- Repair cases: create from a machine, intake wizard (describe → photos → safety → machine → review), adaptive start question by power type, onset/frequency/conditions/codes/recent work/attempts, risk questions with distinct unknown/skip/cannot-check answers, safety holds with guidance, frozen case revisions, stale machine-revision detection and re-pinning, archive, permanent delete.
- Evidence: camera or library on web/iOS/Android, up to 8 photos, independent retry, role labels, reorder, remove; server validation and private metadata-free derivatives; job status.
- Account: units, theme, notification preference, plan/usage display (no purchase), JSON export, account deletion.
- Honest unavailable states for assessment, parts, videos and guides.

## Not available yet (deferred by milestone)
- **M3:** AI observations, adaptive follow-up questions from evidence, source retrieval, hypotheses, next action, evaluation runner, usage metering.
- **M4:** source-backed fitment, offers, YouTube discovery, reviewed guides, repair mode, outcomes, handoff export.
- **M5:** admin approvals, incident handling UI, kill-switch admin, cost dashboards, sandbox web + store purchasing, restore, cancellation, telemetry, release preparation.
- **Separate scopes:** audio analysis, OBD hardware, shop booking, community content, push notifications (optional/deferred).

## Never in scope
Bypass instructions for guards/interlocks/protective circuits/immobilizers/emissions; roadworthiness judgments from photos; invented URLs, prices, specifications, reviewer approvals or licensing claims; automatic checkout of parts.
