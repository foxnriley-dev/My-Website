import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import './helpers';

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

/** Reads the newest email to `to` from the local Mailpit inbox and returns its first link. */
async function latestLink(to: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}&limit=1`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const href = /href="([^"]+)"/.exec(msg.HTML ?? '')?.[1] ?? /(https?:\/\/\S+)/.exec(msg.Text ?? '')?.[1];
      if (href) return href.replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email for ${to}`);
}

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/sign-up');
  await page.getByLabel('Invite code').fill('LOCALDEV01');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
}

test('sign up with an invite, confirm by email link, land signed in', async ({ page }) => {
  const email = `signup-${randomUUID().slice(0, 8)}@example.test`;
  await signUp(page, email, 'a-long-password-1');
  await page.goto(await latestLink(email));
  await page.waitForURL(/\/app$/);
  await expect(page.getByRole('heading', { name: 'Start by adding your machine' })).toBeVisible();
});

test('password recovery: email link → choose new password → sign in with it', async ({ page, browser }) => {
  const email = `recover-${randomUUID().slice(0, 8)}@example.test`;
  await signUp(page, email, 'first-password-123');
  await page.goto(await latestLink(email));
  await page.waitForURL(/\/app$/);
  await page.context().clearCookies();

  const fresh = await (await browser.newContext()).newPage();
  await fresh.goto('/forgot-password');
  await fresh.getByLabel('Email').fill(email);
  await fresh.getByRole('button', { name: 'Send reset link' }).click();
  await expect(fresh.getByText('Check your email')).toBeVisible();
  // The newest email for this address is now the recovery email.
  await new Promise((r) => setTimeout(r, 1000));
  await fresh.goto(await latestLink(email));
  await fresh.waitForURL(/\/reset-password$/);
  await fresh.getByLabel('New password').fill('second-password-456');
  await fresh.getByRole('button', { name: 'Save password' }).click();
  await fresh.waitForURL(/\/app$/);

  const again = await (await browser.newContext()).newPage();
  await again.goto('/sign-in');
  await again.getByLabel('Email').fill(email);
  await again.getByLabel('Password').fill('second-password-456');
  await again.getByRole('button', { name: 'Sign in' }).click();
  await again.waitForURL(/\/app$/);
});
