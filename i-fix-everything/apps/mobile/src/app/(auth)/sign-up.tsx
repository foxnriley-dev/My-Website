import { useState } from 'react';
import { Body, Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { authCallbackUrl } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export default function SignUp() {
  const [invite, setInvite] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 10) return setError('Use at least 10 characters for your password.');
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase().auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authCallbackUrl(), data: { invite_code: invite.trim() } },
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (!data.session) setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <Notice tone="success" title="Check your email">
          {`We sent a confirmation link to ${email}. Open it on this phone to finish signing up.`}
        </Notice>
      </Screen>
    );
  }
  return (
    <Screen>
      <Body muted>The beta is invite-only. Your invite code is in the message you received. For adults (18+).</Body>
      {error ? <Notice tone="danger" title="Could not create the account">{error}</Notice> : null}
      <Card>
        <TextField label="Invite code" value={invite} onChangeText={setInvite} autoCapitalize="characters" autoCorrect={false} />
        <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        <TextField label="Password" hint="At least 10 characters." value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <Button label="Create account" onPress={submit} loading={busy} />
      </Card>
    </Screen>
  );
}
