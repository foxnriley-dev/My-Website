import NetInfo from '@react-native-community/netinfo';
import { ApiProvider, createQueryClient, useMe } from '@ife/api-client/react';
import { focusManager, onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Body, Notice, Screen } from '@/components/ui';
import { createNativeApi } from '@/lib/api';
import { missingConfig } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { SessionProvider, useSession } from '@/lib/session';
import { ThemePrefContext, useTheme } from '@/lib/theme';

void SplashScreen.preventAutoHideAsync();

// Refetch on returning to the foreground; pause queries while offline.
focusManager.setEventListener((handleFocus) => {
  const sub = AppState.addEventListener('change', (s) => handleFocus(s === 'active'));
  return () => sub.remove();
});
onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((s) => setOnline(!!s.isConnected)));

function Themed({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const me = useMe(status === 'signedIn');
  return <ThemePrefContext.Provider value={me.data?.preferences.theme ?? 'system'}>{children}</ThemePrefContext.Provider>;
}

function Navigation() {
  const { status } = useSession();
  const t = useTheme();
  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);
  if (status === 'loading') return <View style={{ flex: 1, backgroundColor: t.c.background }} />;
  const navTheme = t.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...navTheme, colors: { ...navTheme.colors, primary: t.c.accent, background: t.c.background, card: t.c.surface, text: t.c.text, border: t.c.border } }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ title: 'New password' }} />
        </Stack.Protected>
        <Stack.Protected guard={status !== 'signedIn'}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" options={{ title: 'Signing in', headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

function ConfigMissing({ missing }: { missing: string[] }) {
  return (
    <Screen edges={['top', 'bottom']}>
      <Notice tone="warning" title="App configuration is incomplete">
        <Body>Missing: {missing.join(', ')}. Set them in apps/mobile/.env.local (see .env.example) and rebuild.</Body>
      </Notice>
    </Screen>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => createQueryClient());
  const missing = missingConfig();
  // A 401 from the API (expired or revoked session) signs this device out locally.
  const api = useMemo(() => createNativeApi(() => void supabase().auth.signOut({ scope: 'local' })), []);

  useEffect(() => {
    if (missing.length) void SplashScreen.hideAsync();
  }, [missing.length]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={api}>
          {missing.length ? (
            <ConfigMissing missing={missing} />
          ) : (
            <SessionProvider>
              <Themed>
                <Navigation />
              </Themed>
            </SessionProvider>
          )}
        </ApiProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export const unstable_settings = { initialRouteName: '(app)' };
