import { useCase, useIntakeDraft, useMachine, useSaveCaseRevision, useUseLatestMachineRevision, type SaveState } from '@ife/api-client/react';
import { Condition, IDENTITY_FIELD_LABELS, type CaseIntake, type RepairCase } from '@ife/contracts';
import { CHECK_ANSWER_OPTIONS, CONDITION_OPTIONS, evaluateSafety, FREQUENCY_OPTIONS, ONSET_OPTIONS, riskQuestionsFor, startQuestion } from '@ife/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { PhotoManager } from '@/components/photo-manager';
import { SafetyHoldNotices } from '@/components/status';
import { Body, Button, Card, Choice, ErrorNotice, H1, Loading, Notice, Row, Screen, TextField, Toggle } from '@/components/ui';
import { nativeDraftStorage } from '@/lib/drafts';
import { useSession } from '@/lib/session';

const STEPS = ['describe', 'photos', 'safety', 'machine', 'review'] as const;
type Step = (typeof STEPS)[number];
const TITLES: Record<Step, string> = {
  describe: 'What is going on?',
  photos: 'Add photos',
  safety: 'Safety check',
  machine: 'Confirm the machine',
  review: 'Review and save',
};

function saveLabel(s: SaveState): string {
  return {
    saved: 'Saved to your account',
    local: 'Saved on this phone',
    saving: 'Saving…',
    offline: 'Offline — saved on this phone',
    error: 'Not saved to your account yet',
    conflict: 'Changed on another device',
  }[s.kind];
}

function Describe({ kase, value, set }: { kase: RepairCase; value: CaseIntake; set: (v: CaseIntake) => void }) {
  const s = value.symptoms;
  const sym = (patch: Partial<CaseIntake['symptoms']>) => set({ ...value, symptoms: { ...s, ...patch } });
  const q = startQuestion(kase.machinePowerType);
  return (
    <View style={{ gap: 16 }}>
      <TextField label="What is the problem?" hint="Your own words are fine — what you notice, hear, see or smell." multiline value={s.concern} maxLength={4000} onChangeText={(concern) => sym({ concern })} testID="concern" />
      <Choice legend={q.prompt} options={q.options} value={s.startBehavior} onChange={(startBehavior) => sym({ startBehavior })} />
      <Choice legend="When did it start?" options={ONSET_OPTIONS} value={s.onset} onChange={(onset) => sym({ onset })} />
      <Choice legend="How often does it happen?" options={FREQUENCY_OPTIONS} value={s.frequency} onChange={(frequency) => sym({ frequency })} />
      <Card>
        <Body style={{ fontWeight: '700' }}>When does it happen? (choose any)</Body>
        {CONDITION_OPTIONS.map((o) => {
          const on = s.conditions.includes(o.value as Condition);
          return (
            <Toggle
              key={o.value}
              label={o.label}
              value={on}
              onChange={() => sym({ conditions: on ? s.conditions.filter((c) => c !== o.value) : [...s.conditions, o.value as Condition] })}
            />
          );
        })}
      </Card>
      <TextField label="Any recent work, fuel, storage or crashes?" multiline value={s.recentWork} maxLength={2000} onChangeText={(recentWork) => sym({ recentWork })} />
      <TextField
        label="Warning lights or codes"
        hint="Separate codes with commas."
        defaultValue={s.warningCodes.join(', ')}
        autoCapitalize="characters"
        onEndEditing={(e) => sym({ warningCodes: e.nativeEvent.text.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 20) })}
      />
      <TextField label="What have you already tried?" multiline value={s.previousAttempts} maxLength={2000} onChangeText={(previousAttempts) => sym({ previousAttempts })} />
    </View>
  );
}

function Safety({ kase, value, set }: { kase: RepairCase; value: CaseIntake; set: (v: CaseIntake) => void }) {
  const preview = evaluateSafety(value, kase.machineCategory, kase.machinePowerType);
  return (
    <View style={{ gap: 16 }}>
      <Notice tone="info" title="Answer from where you are">
        Do not start the machine, touch hot parts or move closer to check. “Not sure” and “Cannot safely check” are good answers.
      </Notice>
      {riskQuestionsFor(kase.machineCategory, kase.machinePowerType).map((q) => (
        <Choice key={q.id} legend={q.prompt} hint={q.help} options={CHECK_ANSWER_OPTIONS} value={value.risk[q.id]} onChange={(a) => set({ ...value, risk: { ...value.risk, [q.id]: a } })} />
      ))}
      <SafetyHoldNotices hold={preview} />
    </View>
  );
}

function MachineStep({ kase }: { kase: RepairCase }) {
  const machine = useMachine(kase.machineId);
  const repin = useUseLatestMachineRevision(kase.id);
  if (machine.isPending) return <Loading label="Loading machine details" />;
  if (machine.isError) return <ErrorNotice error={machine.error} onRetry={() => machine.refetch()} />;
  const m = machine.data;
  return (
    <View style={{ gap: 12 }}>
      <Body>Check these details. Unknown is fine — guessing is not.</Body>
      {kase.machineRevisionStale ? (
        <Notice tone="warning" title="Machine details changed after this repair started" action={<Button label="Use the latest details" loading={repin.isPending} onPress={() => repin.mutate(kase.version)} />}>
          {`This repair uses version ${kase.machineRevisionNumber}; the machine is now at version ${m.currentRevision.revision}.`}
        </Notice>
      ) : null}
      <Card>
        {(Object.keys(IDENTITY_FIELD_LABELS) as (keyof typeof IDENTITY_FIELD_LABELS)[]).map((k) => (
          <View key={k} accessible>
            <Body style={{ fontWeight: '600' }}>{IDENTITY_FIELD_LABELS[k]}</Body>
            <Body muted={m.currentRevision.identity[k].state !== 'known'}>{m.currentRevision.identity[k].value ?? 'Unknown'}</Body>
          </View>
        ))}
      </Card>
      <Button label="Change machine details" variant="secondary" onPress={() => router.push(`/machine/${m.id}/edit`)} />
    </View>
  );
}

function Wizard({ kase, step }: { kase: RepairCase; step: Step }) {
  const { userId } = useSession();
  const draft = useIntakeDraft(nativeDraftStorage, userId, kase);
  const saveRevision = useSaveCaseRevision(kase.id);
  const idx = STEPS.indexOf(step);
  const go = (s: Step) => router.setParams({ step: s });

  const next = async () => {
    if (draft.state.kind === 'local' || draft.state.kind === 'error' || draft.state.kind === 'offline') await draft.flush();
    if (idx < STEPS.length - 1) go(STEPS[idx + 1]!);
  };

  return (
    <Screen
      footer={
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Button label="Back" icon="arrow-back" variant="secondary" disabled={idx === 0} onPress={() => go(STEPS[Math.max(0, idx - 1)]!)} />
          </View>
          <View style={{ flex: 1 }}>
            {step === 'review' ? (
              <Button
                label="Save this repair"
                loading={saveRevision.isPending || draft.state.kind === 'saving'}
                disabled={draft.state.kind === 'conflict'}
                testID="save-repair"
                onPress={async () => {
                  const version = draft.state.kind === 'saved' ? draft.version() : await draft.flush();
                  if (version === null) return;
                  const done = await saveRevision.mutateAsync(version).catch(() => null);
                  if (done) router.replace(`/case/${kase.id}`);
                }}
              />
            ) : (
              <Button label="Next" icon="arrow-forward" onPress={() => void next()} testID="next" />
            )}
          </View>
        </Row>
      }
    >
      <Stack.Screen options={{ title: `Step ${idx + 1} of ${STEPS.length}` }} />
      <Body muted>{saveLabel(draft.state)}</Body>
      <H1>{TITLES[step]}</H1>
      {draft.state.kind === 'conflict' ? (
        <Notice tone="warning" title="This case was changed on another device">
          <View style={{ gap: 8 }}>
            <Body>Choose which description to keep. Nothing has been overwritten yet.</Body>
            <Body style={{ fontWeight: '600' }}>Other device:</Body>
            <Body>{draft.state.server.intake.symptoms.concern || '(empty)'}</Body>
            <Body style={{ fontWeight: '600' }}>This phone:</Body>
            <Body>{draft.mine?.symptoms.concern || '(empty)'}</Body>
            <Button label="Use the other device’s version" variant="secondary" onPress={() => void draft.resolve('theirs')} />
            <Button label="Keep my edits" onPress={() => void draft.resolve('mine')} />
          </View>
        </Notice>
      ) : null}
      {draft.state.kind === 'error' ? <Notice tone="warning" title="Not saved to your account yet">{`${draft.state.message} Your edits are kept on this phone.`}</Notice> : null}
      <SafetyHoldNotices hold={kase.safetyHold} />
      {step === 'describe' ? <Describe kase={kase} value={draft.value} set={draft.setValue} /> : null}
      {step === 'photos' ? <PhotoManager caseId={kase.id} /> : null}
      {step === 'safety' ? <Safety kase={kase} value={draft.value} set={draft.setValue} /> : null}
      {step === 'machine' ? <MachineStep kase={kase} /> : null}
      {step === 'review' ? (
        <View style={{ gap: 12 }}>
          <Card>
            <Body style={{ fontWeight: '700' }}>Problem</Body>
            <Body muted={!draft.value.symptoms.concern}>{draft.value.symptoms.concern || 'Not described yet'}</Body>
          </Card>
          <Card>
            {kase.readiness.map((r) => (
              <Body key={r.key}>{`${r.ok ? '✓' : '○'} ${r.message}`}</Body>
            ))}
          </Card>
          <Notice tone="neutral" title="Diagnosis is not available in this build yet">
            Saving keeps a fixed copy of this information with the photos for when assessment launches.
          </Notice>
          {saveRevision.isError ? <ErrorNotice title="Not saved" error={saveRevision.error} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

export default function IntakeScreen() {
  const { id, step } = useLocalSearchParams<{ id: string; step?: string }>();
  const q = useCase(id);
  const { userId } = useSession();
  if (q.isPending) return <Screen><Loading label="Loading repair" /></Screen>;
  if (q.isError) return <Screen><ErrorNotice error={q.error} onRetry={() => q.refetch()} /></Screen>;
  const s = (STEPS as readonly string[]).includes(step ?? '') ? (step as Step) : 'describe';
  return <Wizard key={userId ?? 'anon'} kase={q.data.case} step={s} />;
}
