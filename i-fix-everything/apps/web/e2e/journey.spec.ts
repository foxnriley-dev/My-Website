import { expect, test } from '@playwright/test';
import sharp from 'sharp';
import { hasHorizontalOverflow, provisionUser, signIn } from './helpers';

test('public home explains scope honestly and labels the sample @phone', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Figure out what is wrong');
  await expect(page.getByText('Sample — made-up example, not a real customer')).toBeVisible();
  await expect(page.getByText(/Coming next, not available yet/)).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/testimonial|5 stars|trusted by|99%/i);
  expect(await hasHorizontalOverflow(page)).toBe(false);
});

test('signed-out visitors are sent to sign in, preserving the destination', async ({ page }) => {
  await page.goto('/app/garage');
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fgarage/);
});

test('sign-up is gated by an invite code (server-enforced)', async ({ page }) => {
  await page.goto('/sign-up');
  await page.getByLabel('Invite code').fill('NOT-A-REAL-CODE');
  await page.getByLabel('Email').fill(`nocode-${Date.now()}@example.test`);
  await page.getByLabel('Password').fill('long-enough-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Could not create the account' })).toContainText(/invite code is not valid/i);
});

test('core journey: machine → repair → photo → safety → save → resume → sign out', async ({ page, context }) => {
  const user = await provisionUser('journey');
  await signIn(page, user);

  // Empty dashboard guides the first step.
  await expect(page.getByRole('heading', { name: 'Start by adding your machine' })).toBeVisible();
  await page.getByRole('link', { name: 'Add a machine' }).first().click();

  // Unknown fields are accepted.
  await page.getByLabel('Go kart').check();
  await page.getByLabel('Nickname').fill('Blue kart');
  await page.getByRole('button', { name: 'Save machine' }).click();
  await expect(page.getByRole('heading', { name: 'Blue kart' })).toBeVisible();
  await expect(page.getByText('0 of 4 key details known')).toBeVisible();

  await page.getByRole('link', { name: 'Start a repair' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/\/intake\?step=describe/);

  await page.getByLabel('What is the problem?').fill('Pulls the cord, engine turns over but never fires. Sat all winter.');
  await page.getByLabel('It turns over but will not start').check();
  await expect(page.getByText('Saved to your account')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Next' }).click();

  // Photo upload goes direct to private storage and is validated by the worker.
  const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#6b4f2a' } }).jpeg().toBuffer();
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'kart.jpg', mimeType: 'image/jpeg', buffer: jpeg });
  await expect(page.getByText('Ready').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('img', { name: /Whole machine photo 1/ })).toBeVisible();

  // An invalid file is rejected without blocking the good one.
  await page.locator('input[type=file][multiple]').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(page.getByText('Use a JPEG, PNG, WebP or HEIC photo.')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  // Safety: a "yes" raises a hold immediately.
  await page.getByRole('group', { name: /leaking fuel/ }).getByLabel('Yes', { exact: true }).check();
  await expect(page.getByText('Stop: Possible fuel leak').first()).toBeVisible();
  await page.getByRole('group', { name: /leaking fuel/ }).getByLabel('No', { exact: true }).check();
  await page.getByRole('group', { name: /smoke, flames/ }).getByLabel('Cannot safely check').check();
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('heading', { name: 'Confirm the machine' })).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Diagnosis is not available in this build yet')).toBeVisible();
  await page.getByRole('button', { name: 'Save this repair' }).click();

  // Workspace: summary, honest unavailable states, saved version.
  await page.waitForURL(/\/app\/cases\/[0-9a-f-]+$/);
  await expect(page.getByText(/Version 1 ·/)).toBeVisible();
  await page.getByRole('tab', { name: 'Parts' }).click();
  await expect(page.getByText(/not available in this build yet \(planned for milestone 4\)/)).toBeVisible();

  // Data survives a reload and a brand-new tab.
  const caseUrl = page.url();
  await page.reload();
  await expect(page.getByText('Pulls the cord, engine turns over').first()).toBeVisible();
  const second = await context.newPage();
  await second.goto(caseUrl);
  await expect(second.getByText('Pulls the cord, engine turns over').first()).toBeVisible();
  await second.close();

  // Sign out removes protected access.
  await page.goto('/app/account');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(/\/sign-in/);
  await page.goto(caseUrl);
  await expect(page).toHaveURL(/\/sign-in/);
});

test('cross-device edits produce a conflict the user resolves, without losing text', async ({ browser }) => {
  const user = await provisionUser('conflict');
  const a = await (await browser.newContext()).newPage();
  const b = await (await browser.newContext()).newPage();
  await signIn(a, user);
  await signIn(b, user);

  await a.goto('/app/garage/new');
  await a.getByLabel('Small engine equipment').check();
  await a.getByLabel('Nickname').fill('Mower');
  await a.getByRole('button', { name: 'Save machine' }).click();
  await a.getByRole('link', { name: 'Start a repair' }).click();
  await a.getByRole('button', { name: 'Continue' }).click();
  await a.waitForURL(/step=describe/);
  const url = a.url();

  await b.goto(url);
  await expect(b.getByLabel('What is the problem?')).toBeVisible();

  await a.getByLabel('What is the problem?').fill('Edited on the laptop');
  await expect(a.getByText('Saved to your account')).toBeVisible({ timeout: 10_000 });

  await b.getByLabel('What is the problem?').fill('Edited on the phone');
  await expect(b.getByText('This case was changed on another device')).toBeVisible({ timeout: 10_000 });
  await expect(b.getByText('Edited on the laptop')).toBeVisible();
  await b.getByRole('button', { name: 'Keep my edits' }).click();
  await expect(b.getByText('Saved to your account')).toBeVisible({ timeout: 10_000 });

  await a.reload();
  await expect(a.getByLabel('What is the problem?')).toHaveValue('Edited on the phone');
});

test('phone layout: core screens fit without horizontal scrolling @phone', async ({ page }) => {
  const user = await provisionUser('phone');
  await signIn(page, user);
  for (const path of ['/app', '/app/garage', '/app/garage/new', '/app/cases', '/app/account']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await hasHorizontalOverflow(page), path).toBe(false);
  }
  await expect(page.getByRole('navigation', { name: 'Main' }).last()).toBeVisible();
});

test('keyboard: skip link and form controls are reachable', async ({ page }) => {
  await page.goto('/sign-in');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
});
