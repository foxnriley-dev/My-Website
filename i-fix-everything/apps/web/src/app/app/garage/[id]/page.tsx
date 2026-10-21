'use client';

import { ApiError } from '@ife/api-client';
import { useCases, useMachine, useMachineRevisions, useUpdateMachine } from '@ife/api-client/react';
import { COMPONENT_KIND_LABELS, IDENTITY_FIELD_KEYS, IDENTITY_FIELD_LABELS, MACHINE_CATEGORY_LABELS, POWER_TYPE_LABELS, PowerType } from '@ife/contracts';
import { machineTitle } from '@ife/domain';
import { Archive, ArchiveRestore, History, Pencil, Plus } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';
import { CaseStatusPill } from '@/components/status';
import { Alert, Button, Card, ConfirmDialog, ErrorState, LinkButton, Loading, PageHeader } from '@/components/ui';

export default function MachineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const machine = useMachine(id);
  const revisions = useMachineRevisions(id);
  const cases = useCases(id);
  const update = useUpdateMachine(id);

  if (machine.isPending) return <Loading label="Loading machine" />;
  if (machine.isError) {
    if (machine.error instanceof ApiError && machine.error.code === 'not_found') {
      return <Alert tone="warning" title="Machine not found">It may have been deleted, or it belongs to another account.</Alert>;
    }
    return <ErrorState error={machine.error} onRetry={() => machine.refetch()} />;
  }
  const m = machine.data;
  const rev = m.currentRevision;
  const t = machineTitle(m.nickname, rev.identity);
  const show = (k: (typeof IDENTITY_FIELD_KEYS)[number]) => {
    const f = rev.identity[k];
    if (f.state !== 'known') return <span className="text-muted">Unknown</span>;
    const v = k === 'powerType' && PowerType.safeParse(f.value).success ? POWER_TYPE_LABELS[f.value as PowerType] : f.value;
    return (
      <span>
        {v}
        {f.confirmation === 'needs_confirmation' ? <span className="ml-2 text-sm text-warning">(please confirm)</span> : null}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title={t.title}
        subtitle={`${MACHINE_CATEGORY_LABELS[m.category]}${t.subtitle ? ` · ${t.subtitle}` : ''}${m.archivedAt ? ' · Archived' : ''}`}
        actions={
          <>
            {!m.archivedAt ? <LinkButton href={`/app/cases/new?machineId=${m.id}`} icon={Plus}>Start a repair</LinkButton> : null}
            <LinkButton href={`/app/garage/${m.id}/edit`} variant="secondary" icon={Pencil}>Edit details</LinkButton>
          </>
        }
      />
      {update.isError ? <div className="mb-4"><ErrorState error={update.error} /></div> : null}
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card aria-labelledby="identity">
          <h2 id="identity" className="text-lg font-bold">Machine details</h2>
          <p className="text-sm text-muted">
            {m.completeness.known} of {m.completeness.relevant} key details known · version {rev.revision}
          </p>
          {m.completeness.missingKeyFields.length ? (
            <p className="mt-2 text-sm">Helpful to find: {m.completeness.missingKeyFields.join(', ')}</p>
          ) : null}
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {IDENTITY_FIELD_KEYS.map((k) => (
              <div key={k}>
                <dt className="text-sm font-semibold">{IDENTITY_FIELD_LABELS[k]}</dt>
                <dd>{show(k)}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-6 font-semibold">Installed engine, motor or parts</h3>
          {rev.installedComponents.length === 0 ? (
            <p className="text-muted">None recorded.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">
              {rev.installedComponents.map((c) => (
                <li key={c.id}>
                  {COMPONENT_KIND_LABELS[c.kind]}: {[c.make, c.model, c.identifier].filter(Boolean).join(' ') || 'details unknown'}
                  {c.replacesFactory ? ' (not original)' : ''}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 font-semibold">Modifications</h3>
          {rev.modifications.length === 0 ? (
            <p className="text-muted">None recorded.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">{rev.modifications.map((x) => <li key={x.id}>{x.description}</li>)}</ul>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <Card aria-labelledby="repairs">
            <h2 id="repairs" className="text-lg font-bold">Repairs</h2>
            {cases.data?.cases.length ? (
              <ul className="mt-2 divide-y divide-border">
                {cases.data.cases.map((c) => (
                  <li key={c.id}>
                    <Link href={`/app/cases/${c.id}`} className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2 hover:underline">
                      <span>{c.title}</span>
                      <CaseStatusPill status={c.status} hold={c.safetyHold} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-muted">No repairs yet.</p>
            )}
          </Card>
          <Card aria-labelledby="history">
            <h2 id="history" className="flex items-center gap-2 text-lg font-bold"><History className="size-5" aria-hidden /> Detail history</h2>
            <ol className="mt-2 space-y-2 text-[15px]">
              {revisions.data?.revisions.map((r) => (
                <li key={r.id}>
                  <span className="font-semibold">Version {r.revision}</span> · {new Date(r.createdAt).toLocaleString()}
                  <br />
                  <span className="text-muted">
                    {r.revision === 1 ? 'Added' : `Changed: ${r.changedFields.map((f) => IDENTITY_FIELD_LABELS[f as keyof typeof IDENTITY_FIELD_LABELS] ?? (f === 'installedComponents' ? 'installed parts' : f)).join(', ')}`}
                    {r.changeNote ? ` — “${r.changeNote}”` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          {m.archivedAt ? (
            <Button variant="secondary" icon={ArchiveRestore} loading={update.isPending} onClick={() => update.mutate({ archived: false })}>
              Restore machine
            </Button>
          ) : (
            <ConfirmDialog
              trigger={<Button variant="secondary" icon={Archive}>Archive machine</Button>}
              title="Archive this machine?"
              description="It moves out of your garage list. Its details and repair history are kept, and you can restore it later."
              confirmLabel="Archive"
              destructive={false}
              onConfirm={() => update.mutate({ archived: true })}
            />
          )}
        </div>
      </div>
    </>
  );
}
