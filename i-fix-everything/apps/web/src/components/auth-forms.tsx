'use client';

import { safeRedirectPath } from '@ife/domain';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { publicConfigMissing } from '@/lib/env';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { Alert, Button, Card, Field, inputClass } from './ui';

function ConfigGuard({ children }: { children: React.ReactNode }) {
  const missing = publicConfigMissing();
  if (missing.length) {
    return (
      <Alert tone="warning" title="Sign-in is not configured">
        This deployment is missing {missing.join(', ')}. See .env.example and docs/integrations.md.
      </Alert>
    );
  }
  return <>{children}</>;
}

const friendlyAuthError = (message: string) =>
  /invalid login credentials/i.test(message)
    ? 'That email and password do not match an account.'
    : /email not confirmed/i.test(message)
      ? 'Confirm your email first — check your inbox for the link.'
      : message;

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirectPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(params.get('error') === 'link' ? 'That link has expired or was already used. Sign in or request a new link.' : null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (err) return setError(friendlyAuthError(err.message));
    router.replace(next);
    router.refresh();
  }

  return (
    <ConfigGuard>
      <h1 className="mb-6 text-2xl font-bold">Sign in</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error ? <Alert tone="danger" role="alert" title="Could not sign in">{error}</Alert> : null}
          <Field label="Email">{(p) => <input {...p} type="email" autoComplete="email" required className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password">{(p) => <input {...p} type="password" autoComplete="current-password" required className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <Button type="submit" size="lg" loading={busy}>Sign in</Button>
          <div className="flex flex-wrap justify-between gap-2 text-[15px]">
            <Link href="/forgot-password" className="inline-flex min-h-11 items-center underline">Forgot password?</Link>
            <Link href="/sign-up" className="inline-flex min-h-11 items-center underline">Create an account</Link>
          </div>
        </form>
      </Card>
    </ConfigGuard>
  );
}

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('Use at least 10 characters for your password.');
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabaseBrowser().auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/app`,
        data: { invite_code: invite.trim() },
      },
    });
    setBusy(false);
    if (err) return setError(err.message);
    if (data.session) window.location.assign('/app');
    else setSent(true);
  }

  if (sent) {
    return (
      <Alert tone="success" role="status" title="Check your email">
        We sent a confirmation link to {email}. Open it on this device to finish creating your account.
      </Alert>
    );
  }

  return (
    <ConfigGuard>
      <h1 className="mb-2 text-2xl font-bold">Create your account</h1>
      <p className="mb-6 text-muted">The beta is invite-only. Your invite code is in the message you received.</p>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error ? <Alert tone="danger" role="alert" title="Could not create the account">{error}</Alert> : null}
          <Field label="Invite code">{(p) => <input {...p} autoComplete="off" autoCapitalize="characters" className={inputClass} value={invite} onChange={(e) => setInvite(e.target.value)} />}</Field>
          <Field label="Email">{(p) => <input {...p} type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Field label="Password" hint="At least 10 characters.">{(p) => <input {...p} type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <p className="text-sm text-muted">
            For adults (18+). Your machines, photos and repair history are private to your account. See{' '}
            <Link href="/privacy" className="underline">privacy and data</Link>.
          </p>
          <Button type="submit" size="lg" loading={busy}>Create account</Button>
          <Link href="/sign-in" className="inline-flex min-h-11 items-center text-[15px] underline">I already have an account</Link>
        </form>
      </Card>
    </ConfigGuard>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabaseBrowser().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    // Do not reveal whether an account exists; only surface rate limits and outages.
    if (err && /rate|limit|fetch|network/i.test(err.message)) return setError(err.message);
    setSent(true);
  }

  return (
    <ConfigGuard>
      <h1 className="mb-6 text-2xl font-bold">Reset your password</h1>
      {sent ? (
        <Alert tone="success" role="status" title="Check your email">
          If an account exists for {email}, we sent a link to choose a new password.
        </Alert>
      ) : (
        <Card>
          <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
            {error ? <Alert tone="danger" role="alert" title="Could not send the link">{error}</Alert> : null}
            <Field label="Email">{(p) => <input {...p} type="email" autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
            <Button type="submit" size="lg" loading={busy}>Send reset link</Button>
          </form>
        </Card>
      )}
    </ConfigGuard>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setError('Use at least 10 characters.');
    setBusy(true);
    const { error: err } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (err) return setError(/session/i.test(err.message) ? 'This reset link has expired. Request a new one.' : err.message);
    router.replace('/app');
  }

  return (
    <ConfigGuard>
      <h1 className="mb-6 text-2xl font-bold">Choose a new password</h1>
      <Card>
        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          {error ? <Alert tone="danger" role="alert" title="Password not changed">{error}</Alert> : null}
          <Field label="New password" hint="At least 10 characters.">{(p) => <input {...p} type="password" autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
          <Button type="submit" size="lg" loading={busy}>Save password</Button>
        </form>
      </Card>
    </ConfigGuard>
  );
}
