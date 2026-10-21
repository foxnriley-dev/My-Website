import { randomId } from '@ife/api-client';
import { useCreateMachine } from '@ife/api-client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { cleanMachineValue, MachineForm, newMachineValue } from '@/components/machine-form';
import { ErrorNotice, Screen } from '@/components/ui';

export default function NewMachine() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  const create = useCreateMachine();
  const [key] = useState(() => randomId());
  return (
    <Screen>
      <MachineForm
        mode="create"
        initial={newMachineValue()}
        submitting={create.isPending}
        error={create.isError ? <ErrorNotice title="Machine not saved" error={create.error} /> : null}
        onSubmit={(v) =>
          create.mutate(
            { ...cleanMachineValue(v), idempotencyKey: key },
            { onSuccess: (m) => router.replace(then === 'repair' ? `/case/new?machineId=${m.id}` : `/machine/${m.id}`) },
          )
        }
      />
    </Screen>
  );
}
