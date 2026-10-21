import { BRAND } from '@ife/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { Body, Button, Card, H1, Notice, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const { error: err } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) {
      setError(
        /invalid login/i.test(err.message)
          ? 'That email and password do not match an account.'
          : /not confirmed/i.test(err.message)
            ? 'Confirm your email first — check your inbox.'
            : /fetch|network/i.test(err.message)
              ? 'You appear to be offline. Check your connection and try again.'
              : err.message,
      );
    }
    // On success the session listener switches to the signed-in screens.
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <H1>{BRAND.productName}</H1>
      <Body muted>{BRAND.tagline}</Body>
      {error ? <Notice tone="danger" title="Could not sign in">{error}</Notice> : null}
      <Card>
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" testID="email" />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" testID="password" />
        <Button label="Sign in" onPress={submit} loading={busy} testID="sign-in" />
      </Card>
      <Button label="Forgot password?" variant="ghost" onPress={() => router.push('/forgot-password')} />
      <Button label="Create an account" variant="secondary" onPress={() => router.push('/sign-up')} />
    </Screen>
  );
}
