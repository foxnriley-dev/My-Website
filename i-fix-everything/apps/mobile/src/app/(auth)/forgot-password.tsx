import { useState } from 'react';
import { Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { authCallbackUrl } from '@/lib/config';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${authCallbackUrl()}?next=reset-password` });
    setBusy(false);
    setSent(true); // never reveal whether an account exists
  }

  return (
    <Screen>
      {sent ? (
        <Notice tone="success" title="Check your email">
          {`If an account exists for ${email}, we sent a link to choose a new password. Open it on this phone.`}
        </Notice>
      ) : (
        <Card>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Button label="Send reset link" onPress={submit} loading={busy} />
        </Card>
      )}
    </Screen>
  );
}
