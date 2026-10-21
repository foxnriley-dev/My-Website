import { useCases, useMachines } from '@ife/api-client/react';
import { BRAND } from '@ife/domain';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { CaseStatusPill } from '@/components/status';
import { Body, Button, Card, Empty, ErrorNotice, H1, H2, Loading, Screen } from '@/components/ui';
import { useSession } from '@/lib/session';

export default function Home() {
  const { email } = useSession();
  const machines = useMachines();
  const cases = useCases();
  const refresh = () => {
    void machines.refetch();
    void cases.refetch();
  };

  if (machines.isPending || cases.isPending) return <Screen><Loading label="Loading your garage" /></Screen>;
  if (machines.isError) return <Screen><ErrorNotice error={machines.error} onRetry={refresh} /></Screen>;
  if (cases.isError) return <Screen><ErrorNotice error={cases.error} onRetry={refresh} /></Screen>;

  if (machines.data.machines.length === 0) {
    return (
      <Screen>
        <H1>{`Welcome to ${BRAND.productName}`}</H1>
        <Empty
          icon="construct"
          title="Start by adding your machine"
          body="Tell us what it is. Leave anything you are not sure about as unknown."
          action={<Button label="Add a machine" icon="add" onPress={() => router.push('/machine/new')} />}
        />
      </Screen>
    );
  }
  const open = cases.data.cases.filter((c) => !['resolved', 'handed_off', 'archived'].includes(c.status));
  const resume = open[0];
  return (
    <Screen refreshing={machines.isRefetching || cases.isRefetching} onRefresh={refresh}>
      {email ? <Body muted>{`Signed in as ${email}`}</Body> : null}
      <Button label="Start a repair" icon="add-circle" onPress={() => router.push('/case/new')} testID="start-repair" />
      <Card>
        <H2>{resume ? 'Pick up where you left off' : 'No open repairs'}</H2>
        {resume ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`Open repair ${resume.title}`} onPress={() => router.push(`/case/${resume.id}`)} style={{ gap: 6, paddingVertical: 8, minHeight: 48 }}>
            <Body style={{ fontWeight: '600' }}>{resume.title}</Body>
            <CaseStatusPill status={resume.status} hold={resume.safetyHold} />
            <Body muted>{`${resume.machineNickname} · ${resume.evidenceCount} photo${resume.evidenceCount === 1 ? '' : 's'}`}</Body>
          </Pressable>
        ) : (
          <Body muted>When something breaks, start a repair to keep photos and details together.</Body>
        )}
      </Card>
      <Card>
        <H2>Recent activity</H2>
        {cases.data.cases.slice(0, 5).map((c) => (
          <Pressable key={c.id} accessibilityRole="link" onPress={() => router.push(`/case/${c.id}`)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Body>{c.title}</Body>
            <Body muted>{new Date(c.updatedAt).toLocaleDateString()}</Body>
          </Pressable>
        ))}
        {cases.data.cases.length === 0 ? <Body muted>Nothing yet.</Body> : null}
      </Card>
    </Screen>
  );
}
