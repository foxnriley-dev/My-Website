import { useApi, useDeleteAccount, useMe, useUpdatePreferences } from '@ife/api-client/react';
import { PLANS, PRO_VALUE_PROPOSITION } from '@ife/domain';
import { useState } from 'react';
import { Alert, Share } from 'react-native';
import { Body, Button, Card, Choice, ErrorNotice, H2, Loading, Notice, Screen, TextField, Toggle } from '@/components/ui';
import { clearLocalPrivateData, useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function Account() {
  const api = useApi();
  const me = useMe();
  const prefs = useUpdatePreferences();
  const del = useDeleteAccount();
  const { signOut } = useSession();
  const [confirm, setConfirm] = useState('');
  const [exportError, setExportError] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);

  if (me.isPending) return <Screen><Loading label="Loading account" /></Screen>;
  if (me.isError) return <Screen><ErrorNotice error={me.error} onRetry={() => me.refetch()} /></Screen>;
  const m = me.data;
  const e = m.entitlement;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString();

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const data = await api.exportData();
      // Shared only after the user explicitly chooses a destination in the share sheet.
      await Share.share({ title: 'My I Fix Everything data', message: JSON.stringify(data, null, 2) });
    } catch (err) {
      setExportError(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <Screen>
      <Body muted>{m.email ?? ''}</Body>
      {prefs.isError ? <ErrorNotice title="Not saved" error={prefs.error} /> : null}
      <Card>
        <H2>Preferences</H2>
        <Choice
          legend="Units"
          options={[{ value: 'us_customary', label: 'US customary (in, lb·ft, psi, °F)' }, { value: 'metric', label: 'Metric (mm, N·m, kPa, °C)' }] as const}
          value={m.preferences.unitSystem}
          onChange={(unitSystem) => prefs.mutate({ unitSystem })}
        />
        <Choice
          legend="Appearance"
          options={[{ value: 'system', label: 'Match my device' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] as const}
          value={m.preferences.theme}
          onChange={(theme) => prefs.mutate({ theme })}
        />
        <Toggle label="Email me about updates to my repairs" value={m.preferences.notifyCaseUpdatesByEmail} onChange={(v) => prefs.mutate({ notifyCaseUpdatesByEmail: v })} />
        <Body muted>Region: United States (US English, USD).</Body>
      </Card>
      <Card>
        <H2>Plan</H2>
        <Body>{e.tier === 'pro' ? PLANS.pro.displayName : 'Free'}</Body>
        <Body>{`Machines: ${e.usage.savedMachines} of ${e.limits.savedMachines}`}</Body>
        <Body>{`Assessments this period: ${e.usage.standardRuns.used} of ${e.limits.standardRunsPerPeriod} (resets ${fmt(e.usage.standardRuns.periodEnd)})`}</Body>
        {e.quotasProvisional ? <Body muted>Allowances are provisional during the beta.</Body> : null}
        {!e.billingEnabled ? (
          <Notice tone="neutral" title={`${PLANS.pro.displayName}: ${PRO_VALUE_PROPOSITION.toLowerCase()}`}>
            Upgrades are not available yet. Safety information, data export and deletion are always free.
          </Notice>
        ) : null}
      </Card>
      <Card>
        <H2>Your data</H2>
        {exportError ? <ErrorNotice title="Export failed" error={exportError} /> : null}
        <Button label="Export my data" icon="download" variant="secondary" loading={exporting} onPress={exportData} />
        <Button label="Sign out" icon="log-out" variant="secondary" onPress={() => void signOut()} testID="sign-out" />
      </Card>
      <Card>
        <H2>Delete account</H2>
        <Body muted>Deletes your machines, repairs, photos and preferences, and closes your login. This cannot be undone.</Body>
        {del.isError ? <ErrorNotice title="Account not deleted" error={del.error} /> : null}
        <TextField label='Type "DELETE" to confirm' value={confirm} onChangeText={setConfirm} autoCapitalize="characters" />
        <Button
          label="Delete my account"
          icon="trash"
          variant="danger"
          disabled={confirm !== 'DELETE'}
          loading={del.isPending}
          onPress={() =>
            Alert.alert('Delete your account permanently?', 'Everything in your account is deleted now.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete everything',
                style: 'destructive',
                onPress: () =>
                  del.mutate(undefined, {
                    onSuccess: async () => {
                      await clearLocalPrivateData();
                      await supabase().auth.signOut({ scope: 'local' });
                    },
                  }),
              },
            ])
          }
        />
      </Card>
    </Screen>
  );
}
