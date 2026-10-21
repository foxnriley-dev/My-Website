'use client';

import { ApiError } from '@ife/api-client';
import { useCreateMachineRevision, useMachine } from '@ife/api-client/react';
import { useRouter } from 'next/navigation';
import { use, useState } from 'react';
import { cleanMachineValue, MachineForm } from '@/components/machine-form';
import { Alert, Button, ErrorState, Loading, PageHeader } from '@/components/ui';

export default function EditMachine({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const machine = useMachine(id);
  const revise = useCreateMachineRevision(id);
  const [formKey, setFormKey] = useState(0);

  if (machine.isPending) return <Loading label="Loading machine" />;
  if (machine.isError) return <ErrorState error={machine.error} onRetry={() => machine.refetch()} />;
  const m = machine.data;
  const conflict = revise.error instanceof ApiError && revise.error.code === 'conflict';

  return (
    <>
      <PageHeader title={`Edit ${m.nickname}`} subtitle="Saving creates a new version. Earlier repairs keep the details they were based on." />
      <MachineForm
        key={`${m.currentRevision.revision}-${formKey}`}
        mode="revise"
        initial={{ category: m.category, nickname: m.nickname, ...m.currentRevision }}
        submitting={revise.isPending}
        error={
          conflict ? (
            <Alert
              tone="warning"
              role="alert"
              title="These details changed on another device"
              action={
                <Button variant="secondary" onClick={async () => { await machine.refetch(); revise.reset(); setFormKey((k) => k + 1); }}>
                  Load the latest details
                </Button>
              }
            >
              Your edits were not saved, so nothing was overwritten. Load the latest version and make your change again.
            </Alert>
          ) : revise.isError ? (
            <ErrorState title="Details not saved" error={revise.error} />
          ) : null
        }
        onSubmit={(v, changeNote) => {
          const clean = cleanMachineValue(v);
          revise.mutate(
            {
              expectedRevision: m.currentRevision.revision,
              changeNote,
              identity: clean.identity,
              installedComponents: clean.installedComponents,
              modifications: clean.modifications,
            },
            { onSuccess: () => router.replace(`/app/garage/${id}`) },
          );
        }}
      />
    </>
  );
}
