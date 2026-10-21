'use client';

import { randomId } from '@ife/api-client';
import { useCreateMachine } from '@ife/api-client/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { cleanMachineValue, MachineForm, newMachineValue } from '@/components/machine-form';
import { ErrorState, PageHeader } from '@/components/ui';

function NewMachine() {
  const router = useRouter();
  const params = useSearchParams();
  const create = useCreateMachine();
  // One idempotency key per form instance: a double submit or retry cannot create two machines.
  const [key] = useState(() => randomId());
  return (
    <>
      <PageHeader title="Add a machine" />
      <MachineForm
        mode="create"
        initial={newMachineValue()}
        submitting={create.isPending}
        error={create.isError ? <ErrorState title="Machine not saved" error={create.error} /> : null}
        onSubmit={(v) =>
          create.mutate(
            { ...cleanMachineValue(v), idempotencyKey: key },
            {
              onSuccess: (m) =>
                router.replace(params.get('then') === 'repair' ? `/app/cases/new?machineId=${m.id}` : `/app/garage/${m.id}`),
            },
          )
        }
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <NewMachine />
    </Suspense>
  );
}
