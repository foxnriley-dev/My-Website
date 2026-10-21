import { useMachines, useMe } from '@ife/api-client/react';
import { MACHINE_CATEGORY_LABELS } from '@ife/contracts';
import { machineTitle } from '@ife/domain';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { Body, Button, Card, Empty, ErrorNotice, H2, Loading, Notice, Screen } from '@/components/ui';

export default function Garage() {
  const machines = useMachines();
  const me = useMe();
  if (machines.isPending) return <Screen><Loading label="Loading your garage" /></Screen>;
  if (machines.isError) return <Screen><ErrorNotice error={machines.error} onRetry={() => machines.refetch()} /></Screen>;
  const list = machines.data.machines;
  const limit = me.data?.entitlement.limits.savedMachines;
  const atLimit = limit !== undefined && list.length >= limit;
  return (
    <Screen refreshing={machines.isRefetching} onRefresh={() => machines.refetch()}>
      {limit !== undefined ? <Body muted>{`${list.length} of ${limit} active machine${limit === 1 ? '' : 's'} on your plan`}</Body> : null}
      {atLimit && list.length ? (
        <Notice tone="info" title="Machine limit reached">Archive a machine to add another. Archived machines and their history are kept.</Notice>
      ) : (
        <Button label="Add a machine" icon="add" onPress={() => router.push('/machine/new')} />
      )}
      {list.length === 0 ? (
        <Empty icon="car-sport" title="No machines yet" body="Add the machine you want to fix. Unknown details are fine." />
      ) : (
        list.map((m) => {
          const t = machineTitle(m.nickname, m.currentRevision.identity);
          return (
            <Pressable key={m.id} accessibilityRole="link" accessibilityLabel={`${t.title}, ${MACHINE_CATEGORY_LABELS[m.category]}`} onPress={() => router.push(`/machine/${m.id}`)}>
              <Card>
                <Body muted>{MACHINE_CATEGORY_LABELS[m.category]}</Body>
                <H2>{t.title}</H2>
                <Body muted>{t.subtitle ?? 'Make and model unknown'}</Body>
                <Body>{`${m.completeness.known} of ${m.completeness.relevant} key details known`}</Body>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}
