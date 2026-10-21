import { randomId, type UploadManifestEntry } from '@ife/api-client';
import { keys, useApi, useEvidence, useRemoveEvidence, useReorderEvidence, useUpdateEvidence } from '@ife/api-client/react';
import { EVIDENCE_ROLE_LABELS, EvidenceRole, MEDIA_LIMITS, REJECTION_MESSAGES, type EvidenceItem } from '@ife/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { choosePhotos, takePhoto, type PreparedPhoto } from '@/lib/photos';
import { useSession } from '@/lib/session';
import { useTheme } from '@/lib/theme';
import { loadManifest, removeEntry, upload } from '@/lib/uploads';
import { EvidencePill } from './status';
import { Body, Button, Card, Choice, ErrorNotice, Loading, Notice, Row } from './ui';

const ROLE_HELP: Record<EvidenceRole, string> = {
  overview: 'Step back and show the whole machine.',
  concern_closeup: 'Get close to the problem area — only with the engine off and parts cool.',
  label: 'The sticker, plate or stamped code, if you can see it safely.',
  other: 'Anything else that helps.',
};

export function PhotoManager({ caseId, disabled }: { caseId: string; disabled?: boolean }) {
  const t = useTheme();
  const api = useApi();
  const qc = useQueryClient();
  const { userId } = useSession();
  const evidence = useEvidence(caseId);
  const remove = useRemoveEvidence(caseId);
  const reorder = useReorderEvidence(caseId);
  const update = useUpdateEvidence(caseId);
  const [role, setRole] = useState<EvidenceRole>('overview');
  const [local, setLocal] = useState<Record<string, UploadManifestEntry>>({});
  const [cameraDenied, setCameraDenied] = useState<null | { canAskAgain: boolean }>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Show unfinished uploads from earlier sessions (e.g. the app was closed mid-upload).
  useEffect(() => {
    if (!userId) return;
    void loadManifest(userId).then((list) =>
      setLocal(Object.fromEntries(list.filter((e) => e.caseId === caseId && e.state !== 'done').map((e) => [e.localId, e]))),
    );
  }, [caseId, userId]);

  const items = evidence.data?.evidence ?? [];
  const active = items.filter((e) => e.status !== 'rejected');
  const pendingLocal = Object.values(local).filter((l) => l.state !== 'done');
  const remaining = MEDIA_LIMITS.maxImagesPerCase - active.length - pendingLocal.filter((l) => !l.evidenceId).length;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.evidence(caseId) });
    void qc.invalidateQueries({ queryKey: keys.case(caseId) });
  };

  async function start(entry: UploadManifestEntry) {
    if (!userId) return;
    await upload(api, userId, entry, (next) => setLocal((m) => ({ ...m, [next.localId]: next })));
    refresh();
  }

  function enqueue(photos: PreparedPhoto[]) {
    for (const p of photos) {
      const entry: UploadManifestEntry = {
        localId: p.localId,
        idempotencyKey: randomId(),
        caseId,
        role,
        mime: p.mime,
        bytes: p.bytes,
        localUri: p.uri,
        state: p.problem ? 'failed' : 'queued',
        error: p.problem ?? undefined,
        updatedAt: new Date().toISOString(),
      };
      setLocal((m) => ({ ...m, [entry.localId]: entry }));
      if (!p.problem) void start(entry);
    }
  }

  async function onCamera() {
    setNotice(null);
    const res = await takePhoto();
    if (res.status === 'camera_denied') return setCameraDenied({ canAskAgain: res.canAskAgain });
    setCameraDenied(null);
    if (res.status === 'ok') enqueue(res.photos);
  }

  async function onLibrary() {
    setNotice(null);
    const res = await choosePhotos(Math.max(1, remaining));
    if (res.status === 'ok') {
      if (res.photos.length > remaining) setNotice(`Only ${MEDIA_LIMITS.maxImagesPerCase} photos fit in one case.`);
      enqueue(res.photos.slice(0, Math.max(0, remaining)));
    }
  }

  const move = (item: EvidenceItem, dir: -1 | 1) => {
    const order = active.map((e) => e.id);
    const i = order.indexOf(item.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    reorder.mutate(order);
  };

  const visibleLocal = pendingLocal.filter((l) => !(l.evidenceId && items.some((e) => e.id === l.evidenceId && e.status !== 'pending_upload')));

  return (
    <View style={{ gap: t.space[3] }}>
      {!disabled ? (
        <Card>
          <Choice legend="What does the next photo show?" hint={ROLE_HELP[role]} options={EvidenceRole.options.map((r) => ({ value: r, label: EVIDENCE_ROLE_LABELS[r] }))} value={role} onChange={setRole} />
          <Button label="Take a photo" icon="camera" onPress={onCamera} disabled={remaining <= 0} testID="take-photo" />
          <Button label="Choose from library" icon="images" variant="secondary" onPress={onLibrary} disabled={remaining <= 0} testID="choose-photos" />
          <Body muted>{`${Math.max(0, remaining)} of ${MEDIA_LIMITS.maxImagesPerCase} photo slots left. Never approach moving or hot parts for a photo.`}</Body>
        </Card>
      ) : null}

      {cameraDenied ? (
        <Notice
          tone="warning"
          title="Camera access is off"
          action={
            <View style={{ gap: 8 }}>
              <Button label="Choose from library instead" variant="secondary" onPress={onLibrary} />
              {!cameraDenied.canAskAgain ? <Button label="Open Settings" variant="ghost" onPress={() => void Linking.openSettings()} /> : null}
            </View>
          }
        >
          You can still add photos you already have. To use the camera here, allow camera access in Settings.
        </Notice>
      ) : null}
      {notice ? <Notice tone="warning" title="Some photos were not added">{notice}</Notice> : null}

      {visibleLocal.map((l) => (
        <Card key={l.localId}>
          <Body style={{ fontWeight: '600' }}>{EVIDENCE_ROLE_LABELS[l.role]}</Body>
          <Body muted>
            {l.state === 'failed' || l.state === 'needs_reselect' ? l.error : l.state === 'completing' ? 'Finishing…' : 'Uploading…'}
          </Body>
          {l.state === 'failed' ? (
            <Row>
              <Button label="Retry" icon="refresh" variant="secondary" onPress={() => void start(l)} />
              <Button label="Dismiss" variant="ghost" onPress={() => { if (userId) void removeEntry(userId, l.localId); setLocal((m) => { const n = { ...m }; delete n[l.localId]; return n; }); }} />
            </Row>
          ) : null}
          {l.state === 'needs_reselect' ? (
            <Button label="Choose the photo again" variant="secondary" onPress={() => { if (userId) void removeEntry(userId, l.localId); setLocal((m) => { const n = { ...m }; delete n[l.localId]; return n; }); void onLibrary(); }} />
          ) : null}
        </Card>
      ))}

      {evidence.isPending ? <Loading label="Loading photos" /> : null}
      {evidence.isError ? <ErrorNotice error={evidence.error} onRetry={() => evidence.refetch()} /> : null}
      {remove.isError ? <ErrorNotice title="Photo not removed" error={remove.error} /> : null}
      {items.length === 0 && !evidence.isPending ? <Body muted>No photos yet.</Body> : null}

      {items.map((e, idx) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {e.thumb ? (
              <Image source={{ uri: e.thumb.url }} style={{ width: 88, height: 88, borderRadius: 10 }} accessibilityLabel={`${EVIDENCE_ROLE_LABELS[e.role]} photo ${idx + 1}`} contentFit="cover" />
            ) : (
              <View style={{ width: 88, height: 88, borderRadius: 10, backgroundColor: t.c.surfaceSunken }} />
            )}
            <View style={{ flex: 1, gap: 6 }}>
              <Body style={{ fontWeight: '600' }}>{EVIDENCE_ROLE_LABELS[e.role]}</Body>
              <EvidencePill status={e.status} />
              {e.status === 'rejected' && e.rejectionReason ? <Body>{REJECTION_MESSAGES[e.rejectionReason]}</Body> : null}
              {e.status === 'failed' ? <Body>We could not process this photo. Remove it and add it again.</Body> : null}
            </View>
          </View>
          {!disabled ? (
            <Row>
              {e.status !== 'rejected' ? (
                <>
                  <Button label="Earlier" icon="arrow-up" variant="ghost" onPress={() => move(e, -1)} disabled={active[0]?.id === e.id} />
                  <Button label="Later" icon="arrow-down" variant="ghost" onPress={() => move(e, 1)} disabled={active.at(-1)?.id === e.id} />
                </>
              ) : null}
              <Button
                label="Change type"
                variant="ghost"
                icon="pricetag"
                onPress={() =>
                  Alert.alert('What does this photo show?', undefined, [
                    ...EvidenceRole.options.map((r) => ({ text: EVIDENCE_ROLE_LABELS[r], onPress: () => update.mutate({ id: e.id, input: { role: r } }) })),
                    { text: 'Cancel', style: 'cancel' as const },
                  ])
                }
              />
              <Button
                label="Remove"
                icon="trash"
                variant="ghost"
                onPress={() =>
                  Alert.alert('Remove this photo?', 'The photo and its copies are deleted from your case.', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove photo', style: 'destructive', onPress: () => remove.mutate(e.id) },
                  ])
                }
              />
            </Row>
          ) : null}
        </Card>
      ))}
    </View>
  );
}
