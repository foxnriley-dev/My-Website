'use client';

import { ApiError } from '@ife/api-client';
import { useCase, useCaseRevisions, useDeleteCase, useEvidence, useUpdateCase, useUseLatestMachineRevision } from '@ife/api-client/react';
import { EVIDENCE_ROLE_LABELS, MACHINE_CATEGORY_LABELS, type CapabilityState, type RepairCase } from '@ife/contracts';
import { CONDITION_OPTIONS, FREQUENCY_OPTIONS, ONSET_OPTIONS, riskQuestionsFor, startQuestion } from '@ife/domain';
import * as Tabs from '@radix-ui/react-tabs';
import { Archive, ArchiveRestore, Check, Circle, Clock, Loader2, Pencil, PlayCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, use } from 'react';
import { PhotoManager } from '@/components/photo-manager';
import { CaseStatusPill, SafetyHoldBanner } from '@/components/status';
import { Alert, Button, Card, ConfirmDialog, ErrorState, LinkButton, Loading, cx } from '@/components/ui';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
  { id: 'parts', label: 'Parts' },
  { id: 'guide', label: 'Guide' },
] as const;

function Unavailable({ cap, title }: { cap: CapabilityState; title: string }) {
  return (
    <Alert tone={cap.reason === 'safety_hold' ? 'danger' : 'neutral'} title={title}>
      {cap.message}
    </Alert>
  );
}

function label<T extends string>(opts: readonly { value: T; label: string }[], v: T | null | undefined) {
  return opts.find((o) => o.value === v)?.label ?? 'Not answered';
}

function Overview({ c }: { c: RepairCase }) {
  const s = c.intake.symptoms;
  const revisions = useCaseRevisions(c.id);
  return (
    <div className="flex flex-col gap-4">
      <Card aria-labelledby="readiness">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="readiness" className="text-lg font-bold">Case checklist</h2>
          <LinkButton href={`/app/cases/${c.id}/intake?step=describe`} variant="secondary" icon={Pencil}>Edit details</LinkButton>
        </div>
        <ul className="mt-3 flex flex-col gap-2">
          {c.readiness.map((r) => (
            <li key={r.key} className="flex items-start gap-2">
              {r.ok ? <Check className="mt-0.5 size-5 text-success" aria-hidden /> : <Circle className="mt-0.5 size-5 text-muted" aria-hidden />}
              <span><span className="sr-only">{r.ok ? 'Done: ' : 'To do: '}</span>{r.message}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card aria-labelledby="summary">
        <h2 id="summary" className="text-lg font-bold">What you told us</h2>
        <dl className="mt-3 grid gap-3">
          <div><dt className="text-sm font-semibold">Problem</dt><dd className="whitespace-pre-wrap">{s.concern || <span className="text-muted">Not described yet</span>}</dd></div>
          <div><dt className="text-sm font-semibold">{startQuestion(c.machinePowerType).prompt}</dt><dd>{label(startQuestion(c.machinePowerType).options, s.startBehavior)}</dd></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-sm font-semibold">Started</dt><dd>{label(ONSET_OPTIONS, s.onset)}</dd></div>
            <div><dt className="text-sm font-semibold">How often</dt><dd>{label(FREQUENCY_OPTIONS, s.frequency)}</dd></div>
          </div>
          {s.conditions.length ? <div><dt className="text-sm font-semibold">When</dt><dd>{s.conditions.map((x) => label(CONDITION_OPTIONS, x)).join(', ')}</dd></div> : null}
          {s.warningCodes.length ? <div><dt className="text-sm font-semibold">Codes</dt><dd>{s.warningCodes.join(', ')}</dd></div> : null}
          {s.recentWork ? <div><dt className="text-sm font-semibold">Recent work</dt><dd className="whitespace-pre-wrap">{s.recentWork}</dd></div> : null}
          {s.previousAttempts ? <div><dt className="text-sm font-semibold">Already tried</dt><dd className="whitespace-pre-wrap">{s.previousAttempts}</dd></div> : null}
        </dl>
      </Card>
      <Unavailable cap={c.capabilities.assessment} title="Assessment" />
      <Card aria-labelledby="versions">
        <h2 id="versions" className="text-lg font-bold">Saved versions</h2>
        {revisions.data?.revisions.length ? (
          <ul className="mt-2 text-[15px]">
            {revisions.data.revisions.map((r) => (
              <li key={r.id}>Version {r.revision} · {new Date(r.createdAt).toLocaleString()} · {r.evidenceIds.length} photo{r.evidenceIds.length === 1 ? '' : 's'}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-muted">Not saved as a version yet. Finish the steps and choose “Save this repair”.</p>
        )}
      </Card>
    </div>
  );
}

function Troubleshooting({ c }: { c: RepairCase }) {
  const qs = riskQuestionsFor(c.machineCategory, c.machinePowerType);
  return (
    <div className="flex flex-col gap-4">
      <Unavailable cap={c.capabilities.assessment} title="Possible causes and next checks" />
      <Card aria-labelledby="safety-answers">
        <h2 id="safety-answers" className="text-lg font-bold">Safety answers</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {qs.map((q) => {
            const a = c.intake.risk[q.id];
            return (
              <li key={q.id}>
                <span className="font-medium">{q.prompt}</span>{' '}
                <span className="text-muted">{a ? { yes: 'Yes', no: 'No', unknown: 'Not sure', skipped: 'Skipped', cannot_safely_check: 'Cannot safely check' }[a] : 'Not answered'}</span>
              </li>
            );
          })}
        </ul>
        {c.safetyHold.unresolvedChecks.length ? (
          <p className="mt-3 text-sm">Unanswered or unsure safety questions are treated as unknown, not as safe.</p>
        ) : null}
      </Card>
    </div>
  );
}

function EvidenceRail({ caseId }: { caseId: string }) {
  const ev = useEvidence(caseId);
  const ready = ev.data?.evidence.filter((e) => e.status === 'ready') ?? [];
  return (
    <aside aria-label="Photos" className="hidden lg:block">
      <div className="sticky top-24 rounded-[14px] border border-border bg-raised p-3">
        <h2 className="mb-2 font-semibold">Photos</h2>
        {ready.length === 0 ? <p className="text-sm text-muted">No photos yet.</p> : null}
        <ul className="grid grid-cols-2 gap-2">
          {ready.map((e) => (
            <li key={e.id}>
              {e.preview ? (
                <a href={e.preview.url} target="_blank" rel="noreferrer noopener" className="block">
                  <img src={e.thumb?.url ?? e.preview.url} alt={EVIDENCE_ROLE_LABELS[e.role]} className="aspect-square w-full rounded-[8px] object-cover" />
                </a>
              ) : null}
              <p className="mt-1 truncate text-xs text-muted">{EVIDENCE_ROLE_LABELS[e.role]}</p>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Workspace({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview';
  const q = useCase(id);
  const update = useUpdateCase(id);
  const del = useDeleteCase();
  const repin = useUseLatestMachineRevision(id);

  if (q.isPending) return <Loading label="Loading repair" />;
  if (q.isError) {
    if (q.error instanceof ApiError && q.error.code === 'not_found') {
      return <Alert tone="warning" title="Repair not found">It may have been deleted, or it belongs to another account.</Alert>;
    }
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  }
  const c = q.data.case;
  const jobs = q.data.jobs;

  return (
    <>
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{c.title}</h1>
            <p className="text-muted">
              <Link href={`/app/garage/${c.machineId}`} className="underline">{c.machineNickname}</Link> · {MACHINE_CATEGORY_LABELS[c.machineCategory]} · machine details v{c.machineRevisionNumber}
            </p>
          </div>
          <CaseStatusPill status={c.status} hold={c.safetyHold} />
        </div>
        <SafetyHoldBanner hold={c.safetyHold} />
        {c.machineRevisionStale ? (
          <Alert
            tone="warning"
            title="Machine details changed since this repair started"
            action={<Button variant="secondary" loading={repin.isPending} onClick={() => repin.mutate(c.version)}>Use the latest details</Button>}
          >
            Anything based on the older details may no longer apply.
          </Alert>
        ) : null}
        {jobs.length ? (
          <p role="status" className="inline-flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Checking {jobs.length} photo{jobs.length === 1 ? '' : 's'}… you can leave this page; it continues on our side.
          </p>
        ) : null}
        {c.status === 'draft' && c.lastSavedRevision === null ? (
          <div><LinkButton href={`/app/cases/${c.id}/intake?step=describe`} icon={PlayCircle}>Continue the repair steps</LinkButton></div>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs.Root value={tab} onValueChange={(v) => router.replace(`/app/cases/${id}?tab=${v}`, { scroll: false })}>
          <Tabs.List aria-label="Repair sections" className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((t) => (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                className={cx('min-h-11 shrink-0 border-b-2 px-3 font-semibold', tab === t.id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text')}
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="overview"><Overview c={c} /></Tabs.Content>
          <Tabs.Content value="evidence"><PhotoManager caseId={c.id} disabled={!!c.archivedAt} /></Tabs.Content>
          <Tabs.Content value="troubleshooting"><Troubleshooting c={c} /></Tabs.Content>
          <Tabs.Content value="parts"><Unavailable cap={c.capabilities.parts} title="Parts, tools and buying options" /></Tabs.Content>
          <Tabs.Content value="guide">
            <div className="flex flex-col gap-4">
              <Unavailable cap={c.capabilities.guide} title="Step-by-step repair guide" />
              <Unavailable cap={c.capabilities.videos} title="Videos for this repair" />
            </div>
          </Tabs.Content>
        </Tabs.Root>
        <EvidenceRail caseId={c.id} />
      </div>

      <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
        {update.isError ? <ErrorState error={update.error} /> : null}
        {c.archivedAt ? (
          <Button variant="secondary" icon={ArchiveRestore} onClick={() => update.mutate({ expectedVersion: c.version, archived: false })}>Restore repair</Button>
        ) : (
          <Button variant="secondary" icon={Archive} onClick={() => update.mutate({ expectedVersion: c.version, archived: true })}>Archive repair</Button>
        )}
        <ConfirmDialog
          trigger={<Button variant="ghost" icon={Trash2}>Delete repair</Button>}
          title="Delete this repair permanently?"
          description="The description, safety answers, saved versions and all photos are deleted. This cannot be undone."
          confirmLabel="Delete repair"
          onConfirm={() => del.mutate(c.id, { onSuccess: () => router.replace('/app/cases') })}
        />
        {del.isError ? <ErrorState title="Not deleted" error={del.error} /> : null}
        <p className="inline-flex w-full items-center gap-1 text-sm text-muted"><Clock className="size-4" aria-hidden /> Last updated {new Date(c.updatedAt).toLocaleString()}</p>
      </div>
    </>
  );
}

export default function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense>
      <Workspace id={id} />
    </Suspense>
  );
}
