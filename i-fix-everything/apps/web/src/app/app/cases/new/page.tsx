'use client';

import { randomId } from '@ife/api-client';
import { useCreateCase, useMachines } from '@ife/api-client/react';
import { MACHINE_CATEGORY_LABELS } from '@ife/contracts';
import { machineTitle } from '@ife/domain';
import { Plus, Warehouse } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Button, EmptyState, ErrorState, LinkButton, Loading, PageHeader } from '@/components/ui';

function NewCase() {
  const router = useRouter();
  const params = useSearchParams();
  const machines = useMachines();
  const create = useCreateCase();
  const [selected, setSelected] = useState<string | null>(params.get('machineId'));
  const [key] = useState(() => randomId());

  if (machines.isPending) return <Loading label="Loading your garage" />;
  if (machines.isError) return <ErrorState error={machines.error} onRetry={() => machines.refetch()} />;
  const list = machines.data.machines;

  if (list.length === 0) {
    return (
      <>
        <PageHeader title="Start a repair" />
        <EmptyState icon={Warehouse} title="First, add the machine" action={<LinkButton href="/app/garage/new?then=repair" size="lg" icon={Plus}>Add a machine</LinkButton>}>
          Every repair belongs to a machine so its details travel with the case.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Start a repair" subtitle="Which machine needs work?" />
      {create.isError ? <div className="mb-4"><ErrorState title="Repair not started" error={create.error} /></div> : null}
      <fieldset>
        <legend className="sr-only">Machine</legend>
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((m) => {
            const t = machineTitle(m.nickname, m.currentRevision.identity);
            return (
              <li key={m.id}>
                <label className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-[14px] border p-4 ${selected === m.id ? 'border-accent bg-accent-subtle' : 'border-border bg-raised hover:bg-sunken'}`}>
                  <input type="radio" name="machine" className="size-5" checked={selected === m.id} onChange={() => setSelected(m.id)} />
                  <span>
                    <span className="block font-semibold">{t.title}</span>
                    <span className="block text-sm text-muted">{MACHINE_CATEGORY_LABELS[m.category]}{t.subtitle ? ` · ${t.subtitle}` : ''}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          size="lg"
          disabled={!selected}
          loading={create.isPending}
          onClick={() =>
            selected &&
            create.mutate({ idempotencyKey: key, machineId: selected }, { onSuccess: (c) => router.replace(`/app/cases/${c.id}/intake?step=describe`) })
          }
        >
          Continue
        </Button>
        <LinkButton href="/app/garage/new?then=repair" variant="secondary" icon={Plus}>A different machine</LinkButton>
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <NewCase />
    </Suspense>
  );
}
