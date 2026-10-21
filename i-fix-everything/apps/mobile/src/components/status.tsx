import type { CaseStatus, EvidenceStatus, SafetyHold } from '@ife/contracts';
import { CASE_STATUS_LABELS } from '@ife/domain';
import { View } from 'react-native';
import { Body, Notice, Pill } from './ui';

export function CaseStatusPill({ status, hold }: { status: CaseStatus; hold?: SafetyHold }) {
  if (hold?.active) return <Pill tone="danger" icon="alert-circle" label="Paused for safety" />;
  if (status === 'awaiting_media') return <Pill tone="info" icon="cloud-upload" label={CASE_STATUS_LABELS[status]} />;
  if (status === 'resolved') return <Pill tone="success" icon="checkmark-circle" label={CASE_STATUS_LABELS[status]} />;
  return <Pill tone="neutral" icon="ellipse-outline" label={CASE_STATUS_LABELS[status]} />;
}

export function EvidencePill({ status }: { status: EvidenceStatus }) {
  if (status === 'ready') return <Pill tone="success" icon="checkmark-circle" label="Ready" />;
  if (status === 'rejected') return <Pill tone="danger" icon="close-circle" label="Not usable" />;
  if (status === 'failed') return <Pill tone="warning" icon="warning" label="Needs retry" />;
  if (status === 'pending_upload') return <Pill tone="info" icon="cloud-upload" label="Uploading" />;
  return <Pill tone="info" icon="hourglass" label="Checking photo" />;
}

/** Safety holds come first on every case screen and are never behind a paywall. */
export function SafetyHoldNotices({ hold }: { hold: SafetyHold }) {
  if (!hold.active) return null;
  return (
    <View style={{ gap: 12 }}>
      {hold.reasons.map((r) => (
        <Notice key={r.code} tone="danger" title={`Stop: ${r.title}`}>
          <View style={{ gap: 4 }}>
            {r.guidance.map((g) => (
              <Body key={g}>{`• ${g}`}</Body>
            ))}
            {r.specialistRecommended ? <Body style={{ fontWeight: '600' }}>A qualified specialist should handle this.</Body> : null}
            {r.source === 'description' ? <Body muted>Raised because of wording in your description.</Body> : null}
          </View>
        </Notice>
      ))}
    </View>
  );
}
