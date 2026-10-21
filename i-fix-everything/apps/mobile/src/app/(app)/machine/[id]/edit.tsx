import { ApiError } from '@ife/api-client';
import { useCreateMachineRevision, useMachine } from '@ife/api-client/react';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { cleanMachineValue, MachineForm } from '@/components/machine-form';
import { Body, Button, ErrorNotice, Loading, Notice, Screen } from '@/components/ui';

export default function EditMachine() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const machine = useMachine(id);
  const revise = useCreateMachineRevision(id!);
  const [formKey, setFormKey] = useState(0);
  if (machine.isPending) return <Screen><Loading label="Loading machine" /></Screen>;
  if (machine.isError) return <Screen><ErrorNotice error={machine.error} onRetry={() => machine.refetch()} /></Screen>;
  const m = machine.data;
  const conflict = revise.error instanceof ApiError && revise.error.code === 'conflict';
  return (
    <Screen>
      <Body muted>Saving creates a new version. Earlier repairs keep the details they were based on.</Body>
      <MachineForm
        key={`${m.currentRevision.revision}-${formKey}`}
        mode="revise"
        initial={{ category: m.category, nickname: m.nickname, ...m.currentRevision }}
        submitting={revise.isPending}
        error={
          conflict ? (
            <Notice
              tone="warning"
              title="These details changed on another device"
              action={<Button label="Load the latest details" variant="secondary" onPress={async () => { await machine.refetch(); revise.reset(); setFormKey((k) => k + 1); }} />}
            >
              Nothing was overwritten. Load the latest version and make your change again.
            </Notice>
          ) : revise.isError ? (
            <ErrorNotice title="Details not saved" error={revise.error} />
          ) : null
        }
        onSubmit={(v, changeNote) => {
          const clean = cleanMachineValue(v);
          revise.mutate(
            { expectedRevision: m.currentRevision.revision, changeNote, identity: clean.identity, installedComponents: clean.installedComponents, modifications: clean.modifications },
            { onSuccess: () => router.back() },
          );
        }}
      />
    </Screen>
  );
}
