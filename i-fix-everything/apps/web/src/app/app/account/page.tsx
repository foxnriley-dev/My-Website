'use client';

import { useApi, useDeleteAccount, useMe, useUpdatePreferences } from '@ife/api-client/react';
import { PLANS, PRO_VALUE_PROPOSITION } from '@ife/domain';
import { Download, LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Alert, Button, Card, ChoiceList, ConfirmDialog, ErrorState, Field, inputClass, Loading, PageHeader } from '@/components/ui';
import { applyTheme, clearAllLocal } from '@/lib/local-store';
import { supabaseBrowser } from '@/lib/supabase/browser';
import { useSession } from '../providers';

export default function Account() {
  const api = useApi();
  const me = useMe();
  const prefs = useUpdatePreferences();
  const del = useDeleteAccount();
  const { signOut } = useSession();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);
  const [confirmText, setConfirmText] = useState('');

  if (me.isPending) return <Loading label="Loading account" />;
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />;
  const m = me.data;
  const e = m.entitlement;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  async function download() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `i-fix-everything-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle={m.email ?? undefined} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="prefs">
          <h2 id="prefs" className="text-lg font-bold">Preferences</h2>
          {prefs.isError ? <div className="mt-3"><ErrorState title="Not saved" error={prefs.error} /></div> : null}
          <div className="mt-4 flex flex-col gap-6">
            <ChoiceList
              legend="Units"
              hint="Original values from sources are always kept alongside converted ones."
              name="units"
              options={[{ value: 'us_customary', label: 'US customary (in, lb·ft, psi, °F)' }, { value: 'metric', label: 'Metric (mm, N·m, kPa, °C)' }] as const}
              value={m.preferences.unitSystem}
              onChange={(unitSystem) => prefs.mutate({ unitSystem })}
            />
            <ChoiceList
              legend="Appearance"
              name="theme"
              options={[{ value: 'system', label: 'Match my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] as const}
              value={m.preferences.theme}
              onChange={(theme) => {
                applyTheme(theme);
                prefs.mutate({ theme });
              }}
            />
            <p className="text-sm text-muted">Region: United States (US English, USD).</p>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" className="size-5" checked={m.preferences.notifyCaseUpdatesByEmail} onChange={(ev) => prefs.mutate({ notifyCaseUpdatesByEmail: ev.target.checked })} />
              Email me about updates to my repairs (not marketing)
            </label>
          </div>
        </Card>

        <Card aria-labelledby="plan">
          <h2 id="plan" className="text-lg font-bold">Plan</h2>
          <p className="mt-1">{e.tier === 'pro' ? PLANS.pro.displayName : 'Free'}{e.validUntil ? ` · until ${fmt(e.validUntil)}` : ''}</p>
          <ul className="mt-3 space-y-1 text-[15px]">
            <li>Machines: {e.usage.savedMachines} of {e.limits.savedMachines}</li>
            <li>Assessments this period: {e.usage.standardRuns.used} of {e.limits.standardRunsPerPeriod} (resets {fmt(e.usage.standardRuns.periodEnd)})</li>
            {e.tier === 'pro' ? <li>Deep Diagnostic runs: {e.usage.deepRuns.used} of {e.limits.deepRunsPerPeriod}</li> : null}
          </ul>
          {e.quotasProvisional ? <p className="mt-2 text-sm text-muted">Allowances are provisional during the beta and may change before launch.</p> : null}
          {!e.billingEnabled ? (
            <Alert tone="neutral" title={`${PLANS.pro.displayName}: ${PRO_VALUE_PROPOSITION.toLowerCase()}`}>
              Upgrades are not available yet. Safety information, data export and deletion are always free.
            </Alert>
          ) : null}
        </Card>

        <Card aria-labelledby="data">
          <h2 id="data" className="text-lg font-bold">Your data</h2>
          <p className="mt-1 text-muted">Download everything in your account as a JSON file. Photo links in the file expire after 5 minutes.</p>
          {exportError ? <div className="mt-3"><ErrorState title="Export failed" error={exportError} /></div> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" icon={Download} loading={exporting} onClick={download}>Download my data</Button>
            <Button variant="secondary" icon={LogOut} onClick={() => void signOut()}>Sign out</Button>
          </div>
        </Card>

        <Card aria-labelledby="delete">
          <h2 id="delete" className="text-lg font-bold">Delete account</h2>
          <p className="mt-1 text-muted">Deletes your machines, repairs, photos and preferences, and closes your login. This cannot be undone.</p>
          {del.isError ? <div className="mt-3"><ErrorState title="Account not deleted" error={del.error} /></div> : null}
          <div className="mt-3 flex flex-col gap-3">
            <Field label='Type "DELETE" to confirm'>
              {(p) => <input {...p} className={inputClass} value={confirmText} onChange={(ev) => setConfirmText(ev.target.value)} autoComplete="off" />}
            </Field>
            <ConfirmDialog
              trigger={<Button variant="danger" icon={Trash2} disabled={confirmText !== 'DELETE'} loading={del.isPending}>Delete my account</Button>}
              title="Delete your account permanently?"
              description="Everything in your account is deleted now. Backup copies held by our hosting provider expire on their schedule."
              confirmLabel="Delete everything"
              onConfirm={() =>
                del.mutate(undefined, {
                  onSuccess: async () => {
                    clearAllLocal();
                    await supabaseBrowser().auth.signOut({ scope: 'local' });
                    window.location.assign('/?deleted=1');
                  },
                })
              }
            />
          </div>
        </Card>
      </div>
    </>
  );
}
