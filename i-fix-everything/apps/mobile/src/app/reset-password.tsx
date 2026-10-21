import { router } from 'expo-router';
import { useState } from 'react';
import { Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (password.length < 10) return setError('Use at least 10 characters.');
    setBusy(true);
    const { error: err } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(err.message);
    router.replace('/');
  }
  return (
    <Screen>
      {error ? <Notice tone="danger" title="Password not changed">{error}</Notice> : null}
      <Card>
        <TextField label="New password" hint="At least 10 characters." value={password} onChangeText={setPassword} secureTextEntry textContentType="newPassword" />
        <Button label="Save password" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}
