'use client';

import { MACHINE_CATEGORY_LABELS } from '@ife/contracts';
import { useMachines, useMe } from '@ife/api-client/react';
import { machineTitle } from '@ife/domain';
import { Plus, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { Alert, EmptyState, ErrorState, LinkButton, Loading, PageHeader } from '@/components/ui';

export default function Garage() {
  const machines = useMachines();
  const me = useMe();
  if (machines.isPending) return <Loading label="Loading your garage" />;
  if (machines.isError) return <ErrorState error={machines.error} onRetry={() => machines.refetch()} />;
  const list = machines.data.machines;
  const limit = me.data?.entitlement.limits.savedMachines;
  const atLimit = limit !== undefined && list.length >= limit;

  return (
    <>
      <PageHeader
        title="Garage"
        subtitle={limit !== undefined ? `${list.length} of ${limit} active machine${limit === 1 ? '' : 's'} on your plan` : undefined}
        actions={!atLimit ? <LinkButton href="/app/garage/new" icon={Plus}>Add a machine</LinkButton> : undefined}
      />
      {atLimit && list.length > 0 ? (
        <div className="mb-4">
          <Alert tone="info" title="Machine limit reached">
            Your plan keeps {limit} active machine{limit === 1 ? '' : 's'}. Archive one to add another — archived machines and their repair history are kept.
          </Alert>
        </div>
      ) : null}
      {list.length === 0 ? (
        <EmptyState icon={Warehouse} title="No machines yet" action={<LinkButton href="/app/garage/new" size="lg" icon={Plus}>Add a machine</LinkButton>}>
          Add the machine you want to fix. Unknown details are fine.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((m) => {
            const t = machineTitle(m.nickname, m.currentRevision.identity);
            return (
              <li key={m.id}>
                <Link href={`/app/garage/${m.id}`} className="block h-full rounded-[14px] border border-border bg-raised p-4 hover:bg-sunken">
                  <p className="text-sm text-muted">{MACHINE_CATEGORY_LABELS[m.category]}</p>
                  <h2 className="mt-1 text-lg font-bold">{t.title}</h2>
                  <p className="text-muted">{t.subtitle ?? 'Make and model unknown'}</p>
                  <p className="mt-3 text-sm">
                    {m.completeness.known} of {m.completeness.relevant} key details known
                    {m.openCaseCount ? ` · ${m.openCaseCount} open repair${m.openCaseCount === 1 ? '' : 's'}` : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
