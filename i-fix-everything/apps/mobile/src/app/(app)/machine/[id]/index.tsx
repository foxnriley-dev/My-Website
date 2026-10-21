import { ApiError } from '@ife/api-client';
import { useCases, useMachine, useMachineRevisions, useUpdateMachine } from '@ife/api-client/react';
import { COMPONENT_KIND_LABELS, IDENTITY_FIELD_KEYS, IDENTITY_FIELD_LABELS, MACHINE_CATEGORY_LABELS, POWER_TYPE_LABELS, PowerType } from '@ife/contracts';
import { machineTitle } from '@ife/domain';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';
import { CaseStatusPill } from '@/components/status';
import { Body, Button, Card, ErrorNotice, H1, H2, Loading, Notice, Screen } from '@/components/ui';

export default function MachineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const machine = useMachine(id);
  const revisions = useMachineRevisions(id);
  const cases = useCases(id);
  const update = useUpdateMachine(id!);

  if (machine.isPending) return <Screen><Loading label="Loading machine" /></Screen>;
  if (machine.isError) {
    return (
      <Screen>
        {machine.error instanceof ApiError && machine.error.code === 'not_found' ? (
          <Notice tone="warning" title="Machine not found">It may have been deleted, or it belongs to another account.</Notice>
        ) : (
          <ErrorNotice error={machine.error} onRetry={() => machine.refetch()} />
        )}
      </Screen>
    );
  }
  const m = machine.data;
  const rev = m.currentRevision;
  const t = machineTitle(m.nickname, rev.identity);
  const display = (k: (typeof IDENTITY_FIELD_KEYS)[number]) => {
    const f = rev.identity[k];
    if (f.state !== 'known' || !f.value) return 'Unknown';
    return k === 'powerType' && PowerType.safeParse(f.value).success ? POWER_TYPE_LABELS[f.value as PowerType] : f.value;
  };
  return (
    <Screen refreshing={machine.isRefetching} onRefresh={() => machine.refetch()}>
      <Stack.Screen options={{ title: m.nickname }} />
      <H1>{t.title}</H1>
      <Body muted>{`${MACHINE_CATEGORY_LABELS[m.category]}${t.subtitle ? ` · ${t.subtitle}` : ''}${m.archivedAt ? ' · Archived' : ''}`}</Body>
      {!m.archivedAt ? <Button label="Start a repair" icon="add-circle" onPress={() => router.push(`/case/new?machineId=${m.id}`)} /> : null}
      <Button label="Edit details" icon="create" variant="secondary" onPress={() => router.push(`/machine/${m.id}/edit`)} />
      {update.isError ? <ErrorNotice error={update.error} /> : null}
      <Card>
        <H2>Machine details</H2>
        <Body muted>{`${m.completeness.known} of ${m.completeness.relevant} key details known · version ${rev.revision}`}</Body>
        {IDENTITY_FIELD_KEYS.map((k) => (
          <View key={k} accessible style={{ paddingVertical: 4 }}>
            <Body style={{ fontWeight: '600' }}>{IDENTITY_FIELD_LABELS[k]}</Body>
            <Body muted={rev.identity[k].state !== 'known'}>{display(k)}</Body>
          </View>
        ))}
        <H2>Installed parts</H2>
        {rev.installedComponents.length ? (
          rev.installedComponents.map((c) => (
            <Body key={c.id}>{`${COMPONENT_KIND_LABELS[c.kind]}: ${[c.make, c.model, c.identifier].filter(Boolean).join(' ') || 'details unknown'}${c.replacesFactory ? ' (not original)' : ''}`}</Body>
          ))
        ) : (
          <Body muted>None recorded.</Body>
        )}
        <H2>Modifications</H2>
        {rev.modifications.length ? rev.modifications.map((x) => <Body key={x.id}>{`• ${x.description}`}</Body>) : <Body muted>None recorded.</Body>}
      </Card>
      <Card>
        <H2>Repairs</H2>
        {cases.data?.cases.length ? (
          cases.data.cases.map((c) => (
            <Pressable key={c.id} accessibilityRole="link" onPress={() => router.push(`/case/${c.id}`)} style={{ minHeight: 48, gap: 4, paddingVertical: 6 }}>
              <Body>{c.title}</Body>
              <CaseStatusPill status={c.status} hold={c.safetyHold} />
            </Pressable>
          ))
        ) : (
          <Body muted>No repairs yet.</Body>
        )}
      </Card>
      <Card>
        <H2>Detail history</H2>
        {revisions.data?.revisions.map((r) => (
          <Body key={r.id}>{`Version ${r.revision} · ${new Date(r.createdAt).toLocaleString()}${r.changeNote ? ` — “${r.changeNote}”` : ''}`}</Body>
        ))}
      </Card>
      {m.archivedAt ? (
        <Button label="Restore machine" variant="secondary" icon="refresh" loading={update.isPending} onPress={() => update.mutate({ archived: false })} />
      ) : (
        <Button
          label="Archive machine"
          variant="secondary"
          icon="archive"
          onPress={() =>
            Alert.alert('Archive this machine?', 'Its details and repair history are kept, and you can restore it later.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Archive', onPress: () => update.mutate({ archived: true }) },
            ])
          }
        />
      )}
    </Screen>
  );
}
