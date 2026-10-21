'use client';

import type { CaseStatus, EvidenceStatus, SafetyHold } from '@ife/contracts';
import { CASE_STATUS_LABELS } from '@ife/domain';
import { AlertOctagon, CheckCircle2, CircleDashed, Clock, Loader2, OctagonAlert, Upload } from 'lucide-react';
import { Alert, StatusPill } from './ui';

export function CaseStatusPill({ status, hold }: { status: CaseStatus; hold?: SafetyHold }) {
  if (hold?.active) return <StatusPill tone="danger" icon={AlertOctagon}>Paused for safety</StatusPill>;
  const map: Partial<Record<CaseStatus, [Parameters<typeof StatusPill>[0]['tone'], typeof Clock]>> = {
    draft: ['neutral', CircleDashed],
    awaiting_media: ['info', Upload],
    processing: ['info', Loader2],
    resolved: ['success', CheckCircle2],
    archived: ['neutral', CircleDashed],
  };
  const [tone, icon] = map[status] ?? ['info', Clock];
  return <StatusPill tone={tone} icon={icon}>{CASE_STATUS_LABELS[status]}</StatusPill>;
}

export function EvidenceStatusPill({ status }: { status: EvidenceStatus }) {
  switch (status) {
    case 'ready':
      return <StatusPill tone="success" icon={CheckCircle2}>Ready</StatusPill>;
    case 'rejected':
      return <StatusPill tone="danger" icon={OctagonAlert}>Not usable</StatusPill>;
    case 'failed':
      return <StatusPill tone="warning" icon={OctagonAlert}>Needs retry</StatusPill>;
    case 'pending_upload':
      return <StatusPill tone="info" icon={Upload}>Uploading</StatusPill>;
    default:
      return <StatusPill tone="info" icon={Loader2}>Checking photo</StatusPill>;
  }
}

/** Safety holds override everything else on the page and are never paywalled. */
export function SafetyHoldBanner({ hold }: { hold: SafetyHold }) {
  if (!hold.active) return null;
  return (
    <div className="flex flex-col gap-3" role="alert">
      {hold.reasons.map((r) => (
        <Alert key={r.code} tone="danger" title={`Stop: ${r.title}`}>
          <ul className="list-disc space-y-1 pl-5">
            {r.guidance.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          {r.specialistRecommended ? <p className="mt-2 font-medium">A qualified specialist should handle this.</p> : null}
          {r.source === 'description' ? (
            <p className="mt-2 text-sm text-muted">Raised because of wording in your description. If that is not what you meant, edit the description.</p>
          ) : null}
        </Alert>
      ))}
    </div>
  );
}
