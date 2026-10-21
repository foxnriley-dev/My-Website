'use client';

import { useCase, useMachine, useSaveCaseRevision, useUseLatestMachineRevision } from '@ife/api-client/react';
import { Condition, IDENTITY_FIELD_LABELS, type CaseIntake, type RepairCase } from '@ife/contracts';
import {
  CHECK_ANSWER_OPTIONS,
  CONDITION_OPTIONS,
  evaluateSafety,
  FREQUENCY_OPTIONS,
  ONSET_OPTIONS,
  riskQuestionsFor,
  startQuestion,
} from '@ife/domain';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, CloudOff, HardDrive, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, use } from 'react';
import { PhotoManager } from '@/components/photo-manager';
import { SafetyHoldBanner } from '@/components/status';
import { Alert, Button, Card, ChoiceList, ErrorState, Field, inputClass, LinkButton, Loading, cx } from '@/components/ui';
import { useIntakeDraft, type SaveState } from '@/lib/use-intake-draft';
import { useSession } from '../../../providers';

const STEPS = [
  { id: 'describe', label: 'Describe' },
  { id: 'photos', label: 'Photos' },
  { id: 'safety', label: 'Safety' },
  { id: 'machine', label: 'Machine' },
  { id: 'review', label: 'Review' },
] as const;
type StepId = (typeof STEPS)[number]['id'];

function SaveIndicator({ state }: { state: SaveState }) {
  const map = {
    saved: { icon: CheckCircle2, text: 'Saved to your account' },
    local: { icon: HardDrive, text: 'Saved on this device' },
    saving: { icon: Loader2, text: 'Saving…' },
    offline: { icon: CloudOff, text: 'Offline — saved on this device' },
    error: { icon: CloudOff, text: 'Not saved to your account yet' },
    conflict: { icon: CloudOff, text: 'Changed on another device' },
  } as const;
  const m = map[state.kind];
  return (
    <p role="status" className="inline-flex items-center gap-1.5 text-sm text-muted">
      <m.icon className={cx('size-4', state.kind === 'saving' && 'animate-spin')} aria-hidden />
      {m.text}
    </p>
  );
}

function ConflictPanel({ server, mine, onResolve }: { server: RepairCase; mine: CaseIntake | null; onResolve: (c: 'mine' | 'theirs') => void }) {
  return (
    <Alert tone="warning" role="alert" title="This case was changed on another device">
      <p>Choose which description to keep. Nothing has been overwritten yet.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <p className="text-sm font-semibold">Saved from the other device</p>
          <p className="mt-1 whitespace-pre-wrap">{server.intake.symptoms.concern || '(empty)'}</p>
        </div>
        <div className="rounded-[10px] border border-border bg-surface p-3">
          <p className="text-sm font-semibold">Your edits on this device</p>
          <p className="mt-1 whitespace-pre-wrap">{mine?.symptoms.concern || '(empty)'}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onResolve('theirs')}>Use the other device’s version</Button>
        <Button onClick={() => onResolve('mine')}>Keep my edits</Button>
      </div>
    </Alert>
  );
}

function Describe({ kase, value, set }: { kase: RepairCase; value: CaseIntake; set: (v: CaseIntake) => void }) {
  const s = value.symptoms;
  const sym = (patch: Partial<CaseIntake['symptoms']>) => set({ ...value, symptoms: { ...s, ...patch } });
  const q = startQuestion(kase.machinePowerType);
  return (
    <div className="flex flex-col gap-6">
      <Field label="What is the problem?" hint="Describe it in your own words — what you notice, hear, see or smell. You do not need part names.">
        {(p) => <textarea {...p} rows={5} maxLength={4000} className={inputClass} value={s.concern} onChange={(e) => sym({ concern: e.target.value })} />}
      </Field>
      <ChoiceList legend={q.prompt} name="start" options={q.options} value={s.startBehavior} onChange={(startBehavior) => sym({ startBehavior })} />
      <ChoiceList legend="When did it start?" name="onset" options={ONSET_OPTIONS} value={s.onset} onChange={(onset) => sym({ onset })} />
      <ChoiceList legend="How often does it happen?" name="frequency" options={FREQUENCY_OPTIONS} value={s.frequency} onChange={(frequency) => sym({ frequency })} />
      <fieldset>
        <legend className="mb-2 font-semibold">When does it happen? (choose any)</legend>
        <div className="flex flex-wrap gap-2">
          {CONDITION_OPTIONS.map((o) => {
            const on = s.conditions.includes(o.value as Condition);
            return (
              <label key={o.value} className={cx('inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3', on ? 'border-accent bg-accent-subtle' : 'border-border')}>
                <input
                  type="checkbox"
                  className="size-4"
                  checked={on}
                  onChange={() => sym({ conditions: on ? s.conditions.filter((c) => c !== o.value) : [...s.conditions, o.value as Condition] })}
                />
                {o.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Field label="Any recent work, fuel, storage or crashes?">
        {(p) => <textarea {...p} rows={3} maxLength={2000} className={inputClass} value={s.recentWork} onChange={(e) => sym({ recentWork: e.target.value })} />}
      </Field>
      <Field label="Warning lights or codes" hint="Separate codes with commas, e.g. P0301, E05.">
        {(p) => (
          <input
            {...p}
            className={inputClass}
            defaultValue={s.warningCodes.join(', ')}
            onBlur={(e) =>
              sym({ warningCodes: e.target.value.split(',').map((x) => x.trim().toUpperCase()).filter(Boolean).slice(0, 20) })
            }
          />
        )}
      </Field>
      <Field label="What have you already tried?">
        {(p) => <textarea {...p} rows={3} maxLength={2000} className={inputClass} value={s.previousAttempts} onChange={(e) => sym({ previousAttempts: e.target.value })} />}
      </Field>
    </div>
  );
}

function Safety({ kase, value, set }: { kase: RepairCase; value: CaseIntake; set: (v: CaseIntake) => void }) {
  const questions = riskQuestionsFor(kase.machineCategory, kase.machinePowerType);
  const preview = evaluateSafety(value, kase.machineCategory, kase.machinePowerType);
  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info" title="Answer from where you are">
        Do not start the machine, touch hot parts or move closer to check. “Not sure” and “Cannot safely check” are good answers.
      </Alert>
      {questions.map((q) => (
        <ChoiceList
          key={q.id}
          legend={q.prompt}
          hint={q.help}
          name={q.id}
          options={CHECK_ANSWER_OPTIONS}
          value={value.risk[q.id]}
          onChange={(a) => set({ ...value, risk: { ...value.risk, [q.id]: a } })}
        />
      ))}
      <SafetyHoldBanner hold={preview} />
    </div>
  );
}

function MachineStep({ kase }: { kase: RepairCase }) {
  const machine = useMachine(kase.machineId);
  const repin = useUseLatestMachineRevision(kase.id);
  if (machine.isPending) return <Loading label="Loading machine details" />;
  if (machine.isError) return <ErrorState error={machine.error} onRetry={() => machine.refetch()} />;
  const m = machine.data;
  return (
    <div className="flex flex-col gap-4">
      <p>Check these details. Unknown is fine — guessing is not. A wrong model can lead to the wrong parts later.</p>
      {kase.machineRevisionStale ? (
        <Alert
          tone="warning"
          title="The machine details changed after this repair was started"
          action={<Button loading={repin.isPending} onClick={() => repin.mutate(kase.version)}>Use the latest details for this repair</Button>}
        >
          This repair still uses version {kase.machineRevisionNumber}. The machine is now at version {m.currentRevision.revision}.
        </Alert>
      ) : null}
      {repin.isError ? <ErrorState title="Not updated" error={repin.error} /> : null}
      <Card>
        <dl className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(IDENTITY_FIELD_LABELS) as (keyof typeof IDENTITY_FIELD_LABELS)[]).map((k) => (
            <div key={k}>
              <dt className="text-sm font-semibold">{IDENTITY_FIELD_LABELS[k]}</dt>
              <dd className={m.currentRevision.identity[k].state === 'known' ? '' : 'text-muted'}>
                {m.currentRevision.identity[k].value ?? 'Unknown'}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <div>
        <LinkButton href={`/app/garage/${m.id}/edit`} variant="secondary">Change machine details</LinkButton>
      </div>
    </div>
  );
}

function Review({ kase, value }: { kase: RepairCase; value: CaseIntake }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="font-semibold">Problem</h3>
        <p className="mt-1 whitespace-pre-wrap">{value.symptoms.concern || <span className="text-muted">Not described yet</span>}</p>
      </Card>
      <Card>
        <h3 className="font-semibold">Checklist</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {kase.readiness.map((r) => (
            <li key={r.key} className="flex items-start gap-2">
              {r.ok ? <Check className="mt-0.5 size-5 text-success" aria-hidden /> : <Circle className="mt-0.5 size-5 text-muted" aria-hidden />}
              <span>
                <span className="sr-only">{r.ok ? 'Done: ' : 'To do: '}</span>
                {r.message}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Alert tone="neutral" title="Diagnosis is not available in this build yet">
        Saving keeps a fixed copy of this information with the photos. When assessment launches, it will work from the saved version — and ask
        for more information rather than guess.
      </Alert>
    </div>
  );
}

function Wizard({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const step = (STEPS.find((s) => s.id === params.get('step'))?.id ?? 'describe') as StepId;
  const kase = useCase(id);
  const { userId } = useSession();

  if (kase.isPending) return <Loading label="Loading repair" />;
  if (kase.isError) return <ErrorState error={kase.error} onRetry={() => kase.refetch()} />;
  return <WizardBody key={userId ?? 'anon'} kase={kase.data.case} step={step} go={(s) => router.push(`/app/cases/${id}/intake?step=${s}`)} done={() => router.push(`/app/cases/${id}`)} />;
}

function WizardBody({ kase, step, go, done }: { kase: RepairCase; step: StepId; go: (s: StepId) => void; done: () => void }) {
  const { userId } = useSession();
  const draft = useIntakeDraft(userId, kase);
  const saveRevision = useSaveCaseRevision(kase.id);
  const idx = STEPS.findIndex((s) => s.id === step);

  const next = async () => {
    if (draft.state.kind === 'local' || draft.state.kind === 'error') await draft.flush();
    if (idx < STEPS.length - 1) go(STEPS[idx + 1]!.id);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/app/cases/${kase.id}`} className="inline-flex min-h-11 items-center gap-1 font-semibold underline">
          <ArrowLeft className="size-4" aria-hidden /> {kase.title}
        </Link>
        <SaveIndicator state={draft.state} />
      </div>
      <nav aria-label="Steps" className="mb-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => go(s.id)}
                aria-current={s.id === step ? 'step' : undefined}
                className={cx('min-h-11 rounded-full px-3 text-sm font-semibold', s.id === step ? 'bg-accent text-on-accent' : 'bg-sunken text-muted hover:text-text')}
              >
                {i + 1}. {s.label}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {draft.state.kind === 'conflict' ? (
        <div className="mb-4">
          <ConflictPanel server={draft.state.server} mine={draft.mine} onResolve={(c) => void draft.resolve(c)} />
        </div>
      ) : null}
      {draft.state.kind === 'error' ? <div className="mb-4"><Alert tone="warning" title="Not saved to your account yet">{draft.state.message} Your edits are kept on this device.</Alert></div> : null}
      <div className="mb-4"><SafetyHoldBanner hold={kase.safetyHold} /></div>

      <h1 className="mb-4 text-2xl font-bold">{STEPS[idx]!.label === 'Describe' ? 'What is going on?' : STEPS[idx]!.label === 'Photos' ? 'Add photos' : STEPS[idx]!.label === 'Safety' ? 'Safety check' : STEPS[idx]!.label === 'Machine' ? 'Confirm the machine' : 'Review and save'}</h1>

      {step === 'describe' ? <Describe kase={kase} value={draft.value} set={draft.setValue} /> : null}
      {step === 'photos' ? <PhotoManager caseId={kase.id} /> : null}
      {step === 'safety' ? <Safety kase={kase} value={draft.value} set={draft.setValue} /> : null}
      {step === 'machine' ? <MachineStep kase={kase} /> : null}
      {step === 'review' ? <Review kase={kase} value={draft.value} /> : null}

      {saveRevision.isError ? <div className="mt-4"><ErrorState title="Not saved" error={saveRevision.error} /></div> : null}
      <div className="sticky bottom-20 z-10 mt-8 flex flex-wrap justify-between gap-2 rounded-[14px] bg-background/90 py-2 backdrop-blur md:static md:bg-transparent">
        <Button variant="secondary" icon={ArrowLeft} disabled={idx === 0} onClick={() => go(STEPS[Math.max(0, idx - 1)]!.id)}>
          Back
        </Button>
        {step === 'review' ? (
          <Button
            size="lg"
            loading={saveRevision.isPending || draft.state.kind === 'saving'}
            disabled={draft.state.kind === 'conflict'}
            onClick={async () => {
              const version = draft.state.kind === 'saved' ? draft.version() : await draft.flush();
              if (version === null) return;
              const fresh = await saveRevision.mutateAsync(version).catch(() => null);
              if (fresh) done();
            }}
          >
            Save this repair
          </Button>
        ) : (
          <Button size="lg" onClick={() => void next()}>
            Next <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </>
  );
}

export default function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Wizard id={id} />
    </Suspense>
  );
}
