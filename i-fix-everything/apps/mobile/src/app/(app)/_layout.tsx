import { keys, useApi } from '@ife/api-client/react';
import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSession } from '@/lib/session';
import { resumePending } from '@/lib/uploads';

/** Finishes interrupted uploads on launch and whenever the app returns to the foreground. */
function UploadResumer() {
  const api = useApi();
  const qc = useQueryClient();
  const { userId } = useSession();
  useEffect(() => {
    if (!userId) return;
    let running = false;
    const run = () => {
      if (running) return;
      running = true;
      void resumePending(api, userId, (e) => {
        if (e.state === 'done') void qc.invalidateQueries({ queryKey: keys.evidence(e.caseId) });
      }).finally(() => {
        running = false;
      });
    };
    run();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && run());
    return () => sub.remove();
  }, [api, qc, userId]);
  return null;
}

export default function AppLayout() {
  return (
    <>
      <UploadResumer />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="machine/new" options={{ title: 'Add a machine', presentation: 'modal' }} />
        <Stack.Screen name="machine/[id]/index" options={{ title: 'Machine' }} />
        <Stack.Screen name="machine/[id]/edit" options={{ title: 'Edit details' }} />
        <Stack.Screen name="case/new" options={{ title: 'Start a repair' }} />
        <Stack.Screen name="case/[id]/index" options={{ title: 'Repair' }} />
        <Stack.Screen name="case/[id]/intake" options={{ title: 'Repair details' }} />
      </Stack>
    </>
  );
}
