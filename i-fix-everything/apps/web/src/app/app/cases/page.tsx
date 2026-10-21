'use client';

import { useCases } from '@ife/api-client/react';
import { ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import { CaseStatusPill } from '@/components/status';
import { EmptyState, ErrorState, LinkButton, Loading, PageHeader } from '@/components/ui';

export default function Cases() {
  const cases = useCases();
  if (cases.isPending) return <Loading label="Loading repairs" />;
  if (cases.isError) return <ErrorState error={cases.error} onRetry={() => cases.refetch()} />;
  const list = cases.data.cases;
  return (
    <>
      <PageHeader title="Repairs" actions={<LinkButton href="/app/cases/new" icon={Plus}>Start a repair</LinkButton>} />
      {list.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No repairs yet" action={<LinkButton href="/app/cases/new" size="lg" icon={Plus}>Start a repair</LinkButton>}>
          A repair keeps the photos, symptoms and safety checks for one problem together.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((c) => (
            <li key={c.id}>
              <Link href={`/app/cases/${c.id}`} className="block rounded-[14px] border border-border bg-raised p-4 hover:bg-sunken">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{c.title}</h2>
                  <CaseStatusPill status={c.status} hold={c.safetyHold} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {c.machineNickname} · {c.evidenceCount} photo{c.evidenceCount === 1 ? '' : 's'} · updated {new Date(c.updatedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
