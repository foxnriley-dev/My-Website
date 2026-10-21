'use client';

import { useCases, useMachines, useMe } from '@ife/api-client/react';
import { BRAND } from '@ife/domain';
import { ClipboardList, Plus, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { CaseStatusPill } from '@/components/status';
import { Card, EmptyState, ErrorState, LinkButton, Loading, PageHeader } from '@/components/ui';

export default function Dashboard() {
  const me = useMe();
  const machines = useMachines();
  const cases = useCases();

  if (machines.isPending || cases.isPending) return <Loading label="Loading your garage" />;
  if (machines.isError) return <ErrorState error={machines.error} onRetry={() => machines.refetch()} />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => cases.refetch()} />;

  const open = cases.data.cases.filter((c) => !['resolved', 'handed_off', 'archived'].includes(c.status));
  const resume = open[0];

  if (machines.data.machines.length === 0) {
    return (
      <>
        <PageHeader title={`Welcome to ${BRAND.productName}`} />
        <EmptyState
          icon={Warehouse}
          title="Start by adding your machine"
          action={<LinkButton href="/app/garage/new" size="lg" icon={Plus}>Add a machine</LinkButton>}
        >
          Tell us what it is — a mower, a go kart, a car. Leave anything you are not sure about as unknown.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Home"
        subtitle={me.data?.email ? `Signed in as ${me.data.email}` : undefined}
        actions={<LinkButton href="/app/cases/new" size="lg" icon={Plus}>Start a repair</LinkButton>}
      />
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card aria-labelledby="resume">
          <h2 id="resume" className="text-lg font-bold">{resume ? 'Pick up where you left off' : 'No open repairs'}</h2>
          {resume ? (
            <Link href={`/app/cases/${resume.id}`} className="mt-3 block rounded-[12px] border border-border bg-surface p-4 hover:bg-sunken">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{resume.title}</span>
                <CaseStatusPill status={resume.status} hold={resume.safetyHold} />
              </div>
              <p className="mt-1 text-sm text-muted">
                {resume.machineNickname} · {resume.evidenceCount} photo{resume.evidenceCount === 1 ? '' : 's'} · updated{' '}
                {new Date(resume.updatedAt).toLocaleString()}
              </p>
            </Link>
          ) : (
            <p className="mt-2 text-muted">When something breaks, start a repair to collect photos and details in one place.</p>
          )}
        </Card>
        <Card aria-labelledby="recent">
          <h2 id="recent" className="text-lg font-bold">Recent activity</h2>
          {cases.data.cases.length === 0 ? (
            <p className="mt-2 text-muted">Nothing yet.</p>
          ) : (
            <ul className="mt-2 divide-y divide-border">
              {cases.data.cases.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <Link href={`/app/cases/${c.id}`} className="flex min-h-11 items-center justify-between gap-2 py-2 hover:underline">
                    <span className="min-w-0 truncate">{c.title}</span>
                    <span className="shrink-0 text-sm text-muted">{new Date(c.updatedAt).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <LinkButton href="/app/cases" variant="secondary" icon={ClipboardList}>All repairs</LinkButton>
            <LinkButton href="/app/garage" variant="secondary" icon={Warehouse}>Garage</LinkButton>
          </div>
        </Card>
      </div>
    </>
  );
}
