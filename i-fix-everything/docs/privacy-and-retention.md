# Privacy, retention and deletion (implementation facts)

This documents what the software actually does. It is not legal text.

## Data stored
| Data | Where | Retention |
|---|---|---|
| Account email, auth sessions | Supabase Auth | Until account deletion |
| Profile preferences | `app.profiles` | Until account deletion |
| Machines + immutable revisions | `app.machines`, `app.machine_revisions` | Until account deletion |
| Cases, intake, frozen revisions | `app.repair_cases`, `app.case_revisions` | Until case or account deletion |
| Original photos | Private bucket `case-media` (`user/case/evidence/original`) — may contain EXIF/GPS | Until photo, case or account deletion; rejected files deleted immediately |
| Derivatives (preview, thumb, analysis) | Same bucket; **re-encoded without metadata** | Same as original |
| Job records | `app.jobs` | Until case/account deletion |
| Audit events | `app.audit_events` — ids, action names, counts; no symptom text, photos, VINs or tokens | `user_id` set null on account deletion |
| Deletion log | `app.deletion_requests` — user id + counts only | Kept for operational proof |
| Invite redemptions | Hashed code + hashed email | Kept |
| Native device | Session in Keychain/Keystore; intake drafts and upload manifest in secure store; prepared photo copies in app documents | Cleared on sign-out / account switch; photo copies deleted after successful upload |
| Web browser | Session cookies; unsent drafts in localStorage | Cleared on sign-out |

## Deletion
- **Photo:** removes original + derivatives from storage, then the row; cancels pending jobs.
- **Case:** removes every object under the case prefix, then cascades rows.
- **Account:** removes every object under the user prefix, then deletes the Auth user (all rows cascade).
- **Backups:** hosted database backups expire on the hosting plan's schedule (e.g. daily backups retained for the plan's
  window). The exact window must be stated publicly once the production plan is chosen. Not configured yet.

## Not claimed
No automatic face/plate redaction. No training reuse by default. Processor retention for the future inference
provider must be documented from its actual terms in Milestone 3.

## Analytics
None implemented. When added, raw symptoms, photos, VINs and secrets must stay out of analytics events.
