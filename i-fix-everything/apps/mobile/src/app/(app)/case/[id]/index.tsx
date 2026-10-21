import { ApiError } from '@ife/api-client';
import { useCase, useCaseRevisions, useDeleteCase, useUpdateCase, useUseLatestMachineRevision } from '@ife/api-client/react';
import type { CapabilityState, RepairCase } from '@ife/contracts';
import { CONDITION_OPTIONS, FREQUENCY_OPTIONS, ONSET_OPTIONS, riskQuestionsFor, startQuestion } from '@ife/domain';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { PhotoManager } from '@/components/photo-manager';
import { CaseStatusPill, SafetyHoldNotices } from '@/components/status';
import { Body, Button, Card, ErrorNotice, H1, H2, Loading, Notice, Screen } from '@/components/ui';
import { useTheme } from '@/lib/theme';

const SECTIONS = ['Overview', 'Evidence', 'Troubleshooting', 'Parts', 'Guide'] as const;
type Section = (typeof SECTIONS)[number];

const label = <T extends string>(opts: readonly { value: T; label: string }[], v: T | null | undefined) =>
  opts.find((o) => o.value === v)?.label ?? 'Not answered';

function Unavailable({ cap, title }: { cap: CapabilityState; title: string }) {
  return <Notice tone={cap.reason === 'safety_hold' ? 'danger' : 'neutral'} title={title}>{cap.message}</Notice>;
}

function Overview({ c }: { c: RepairCase }) {
  const s = c.intake.symptoms;
  const revisions = useCaseRevisions(c.id);
  const q = startQuestion(c.machinePowerType);
  return (
    <View style={{ gap: 12 }}>
      <Card>
        <H2>Case checklist</H2>
        {c.readiness.map((r) => (
          <View key={r.key} accessible accessibilityLabel={`${r.ok ? 'Done' : 'To do'}: ${r.message}`} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
            <Ionicons name={r.ok ? 'checkmark-circle' : 'ellipse-outline'} size={20} />
            <Body style={{ flex: 1 }}>{r.message}</Body>
          </View>
        ))}
        <Button label="Edit details" icon="create" variant="secondary" onPress={() => router.push(`/case/${c.id}/intake?step=describe`)} />
      </Card>
      <Card>
        <H2>What you told us</H2>
        <Body style={{ fontWeight: '600' }}>Problem</Body>
        <Body muted={!s.concern}>{s.concern || 'Not described yet'}</Body>
        <Body style={{ fontWeight: '600' }}>{q.prompt}</Body>
        <Body>{label(q.options, s.startBehavior)}</Body>
        <Body>{`Started: ${label(ONSET_OPTIONS, s.onset)} · ${label(FREQUENCY_OPTIONS, s.frequency)}`}</Body>
        {s.conditions.length ? <Body>{`When: ${s.conditions.map((x) => label(CONDITION_OPTIONS, x)).join(', ')}`}</Body> : null}
        {s.warningCodes.length ? <Body>{`Codes: ${s.warningCodes.join(', ')}`}</Body> : null}
      </Card>
      <Unavailable cap={c.capabilities.assessment} title="Assessment" />
      <Card>
        <H2>Saved versions</H2>
        {revisions.data?.revisions.length ? (
          revisions.data.revisions.map((r) => <Body key={r.id}>{`Version ${r.revision} · ${new Date(r.createdAt).toLocaleString()}`}</Body>)
        ) : (
          <Body muted>Not saved as a version yet.</Body>
        )}
      </Card>
    </View>
  );
}

function Troubleshooting({ c }: { c: RepairCase }) {
  const names = { yes: 'Yes', no: 'No', unknown: 'Not sure', skipped: 'Skipped', cannot_safely_check: 'Cannot safely check' } as const;
  return (
    <View style={{ gap: 12 }}>
      <Unavailable cap={c.capabilities.assessment} title="Possible causes and next checks" />
      <Card>
        <H2>Safety answers</H2>
        {riskQuestionsFor(c.machineCategory, c.machinePowerType).map((q) => (
          <Body key={q.id}>{`${q.prompt} — ${c.intake.risk[q.id] ? names[c.intake.risk[q.id]!] : 'Not answered'}`}</Body>
        ))}
        {c.safetyHold.unresolvedChecks.length ? <Body muted>Unanswered or unsure safety questions are treated as unknown, not as safe.</Body> : null}
      </Card>
    </View>
  );
}

export default function CaseWorkspace() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const q = useCase(id);
  const update = useUpdateCase(id!);
  const del = useDeleteCase();
  const repin = useUseLatestMachineRevision(id!);
  const [section, setSection] = useState<Section>('Overview');

  if (q.isPending) return <Screen><Loading label="Loading repair" /></Screen>;
  if (q.isError) {
    return (
      <Screen>
        {q.error instanceof ApiError && q.error.code === 'not_found' ? (
          <Notice tone="warning" title="Repair not found">It may have been deleted, or it belongs to another account.</Notice>
        ) : (
          <ErrorNotice error={q.error} onRetry={() => q.refetch()} />
        )}
      </Screen>
    );
  }
  const c = q.data.case;
  return (
    <Screen refreshing={q.isRefetching} onRefresh={() => q.refetch()}>
      <Stack.Screen options={{ title: c.machineNickname }} />
      <H1>{c.title}</H1>
      <Body muted>{`${c.machineNickname} · machine details v${c.machineRevisionNumber}`}</Body>
      <CaseStatusPill status={c.status} hold={c.safetyHold} />
      <SafetyHoldNotices hold={c.safetyHold} />
      {c.machineRevisionStale ? (
        <Notice tone="warning" title="Machine details changed since this repair started" action={<Button label="Use the latest details" variant="secondary" loading={repin.isPending} onPress={() => repin.mutate(c.version)} />}>
          Anything based on the older details may no longer apply.
        </Notice>
      ) : null}
      {q.data.jobs.length ? <Body muted>{`Checking ${q.data.jobs.length} photo${q.data.jobs.length === 1 ? '' : 's'}… this continues on our side if you leave.`}</Body> : null}
      {c.lastSavedRevision === null ? <Button label="Continue the repair steps" icon="play" onPress={() => router.push(`/case/${c.id}/intake?step=describe`)} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ gap: 8 }}>
        {SECTIONS.map((s) => (
          <Pressable
            key={s}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === s }}
            onPress={() => setSection(s)}
            style={{ minHeight: t.minTouchTarget, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, backgroundColor: section === s ? t.c.accent : t.c.surfaceSunken }}
          >
            <Body style={{ color: section === s ? t.c.accentText : t.c.text, fontWeight: '600' }}>{s}</Body>
          </Pressable>
        ))}
      </ScrollView>

      {section === 'Overview' ? <Overview c={c} /> : null}
      {section === 'Evidence' ? <PhotoManager caseId={c.id} disabled={!!c.archivedAt} /> : null}
      {section === 'Troubleshooting' ? <Troubleshooting c={c} /> : null}
      {section === 'Parts' ? <Unavailable cap={c.capabilities.parts} title="Parts, tools and buying options" /> : null}
      {section === 'Guide' ? (
        <View style={{ gap: 12 }}>
          <Unavailable cap={c.capabilities.guide} title="Step-by-step repair guide" />
          <Unavailable cap={c.capabilities.videos} title="Videos for this repair" />
        </View>
      ) : null}

      {update.isError ? <ErrorNotice error={update.error} /> : null}
      {del.isError ? <ErrorNotice title="Not deleted" error={del.error} /> : null}
      <Button
        label={c.archivedAt ? 'Restore repair' : 'Archive repair'}
        icon="archive"
        variant="secondary"
        onPress={() => update.mutate({ expectedVersion: c.version, archived: !c.archivedAt })}
      />
      <Button
        label="Delete repair"
        icon="trash"
        variant="ghost"
        onPress={() =>
          Alert.alert('Delete this repair permanently?', 'The description, safety answers, saved versions and all photos are deleted.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete repair', style: 'destructive', onPress: () => del.mutate(c.id, { onSuccess: () => router.back() }) },
          ])
        }
      />
    </Screen>
  );
}
