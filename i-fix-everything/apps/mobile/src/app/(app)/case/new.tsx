import { randomId } from '@ife/api-client';
import { useCreateCase, useMachines } from '@ife/api-client/react';
import { MACHINE_CATEGORY_LABELS } from '@ife/contracts';
import { machineTitle } from '@ife/domain';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Choice, Empty, ErrorNotice, Loading, Screen } from '@/components/ui';

export default function NewCase() {
  const { machineId } = useLocalSearchParams<{ machineId?: string }>();
  const machines = useMachines();
  const create = useCreateCase();
  const [selected, setSelected] = useState<string | null>(machineId ?? null);
  const [key] = useState(() => randomId());

  if (machines.isPending) return <Screen><Loading label="Loading your garage" /></Screen>;
  if (machines.isError) return <Screen><ErrorNotice error={machines.error} onRetry={() => machines.refetch()} /></Screen>;
  const list = machines.data.machines;
  if (list.length === 0) {
    return (
      <Screen>
        <Empty icon="construct" title="First, add the machine" body="Every repair belongs to a machine so its details travel with the case." action={<Button label="Add a machine" icon="add" onPress={() => router.push('/machine/new?then=repair')} />} />
      </Screen>
    );
  }
  return (
    <Screen
      footer={
        <Button
          label="Continue"
          disabled={!selected}
          loading={create.isPending}
          testID="continue"
          onPress={() => selected && create.mutate({ idempotencyKey: key, machineId: selected }, { onSuccess: (c) => router.replace(`/case/${c.id}/intake?step=describe`) })}
        />
      }
    >
      <Body>Which machine needs work?</Body>
      {create.isError ? <ErrorNotice title="Repair not started" error={create.error} /> : null}
      <Choice
        legend="Machine"
        options={list.map((m) => {
          const t = machineTitle(m.nickname, m.currentRevision.identity);
          return { value: m.id, label: `${t.title} — ${MACHINE_CATEGORY_LABELS[m.category]}${t.subtitle ? `, ${t.subtitle}` : ''}` };
        })}
        value={selected}
        onChange={setSelected}
      />
      <Button label="A different machine" icon="add" variant="secondary" onPress={() => router.push('/machine/new?then=repair')} />
    </Screen>
  );
}
