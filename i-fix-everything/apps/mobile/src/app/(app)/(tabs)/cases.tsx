import { useCases } from '@ife/api-client/react';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { CaseStatusPill } from '@/components/status';
import { Body, Button, Card, Empty, ErrorNotice, H2, Loading, Screen } from '@/components/ui';

export default function Cases() {
  const cases = useCases();
  if (cases.isPending) return <Screen><Loading label="Loading repairs" /></Screen>;
  if (cases.isError) return <Screen><ErrorNotice error={cases.error} onRetry={() => cases.refetch()} /></Screen>;
  return (
    <Screen refreshing={cases.isRefetching} onRefresh={() => cases.refetch()}>
      <Button label="Start a repair" icon="add-circle" onPress={() => router.push('/case/new')} />
      {cases.data.cases.length === 0 ? (
        <Empty icon="clipboard" title="No repairs yet" body="A repair keeps the photos, symptoms and safety checks for one problem together." />
      ) : (
        cases.data.cases.map((c) => (
          <Pressable key={c.id} accessibilityRole="link" accessibilityLabel={`Repair: ${c.title}`} onPress={() => router.push(`/case/${c.id}`)}>
            <Card>
              <H2>{c.title}</H2>
              <CaseStatusPill status={c.status} hold={c.safetyHold} />
              <Body muted>{`${c.machineNickname} · ${c.evidenceCount} photo${c.evidenceCount === 1 ? '' : 's'} · ${new Date(c.updatedAt).toLocaleString()}`}</Body>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}
