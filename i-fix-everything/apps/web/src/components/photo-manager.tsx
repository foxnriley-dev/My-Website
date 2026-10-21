'use client';

import { normalizeMime, prevalidate, randomId, runUpload, type UploadManifestEntry } from '@ife/api-client';
import { keys, useApi, useEvidence, useRemoveEvidence, useReorderEvidence, useUpdateEvidence } from '@ife/api-client/react';
import { EVIDENCE_ROLE_LABELS, EvidenceRole, MEDIA_LIMITS, REJECTION_MESSAGES, type EvidenceItem } from '@ife/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Camera, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { EvidenceStatusPill } from './status';
import { Alert, Button, ConfirmDialog, ErrorState, Loading } from './ui';

const ROLE_HELP: Record<EvidenceRole, string> = {
  overview: 'Step back and show the whole machine.',
  concern_closeup: 'Get close to the problem area. Only with the engine off and parts cool.',
  label: 'The sticker, plate or stamped code — only if you can see it safely.',
  other: 'Anything else that helps.',
};

export function PhotoManager({ caseId, disabled }: { caseId: string; disabled?: boolean }) {
  const api = useApi();
  const qc = useQueryClient();
  const evidence = useEvidence(caseId);
  const remove = useRemoveEvidence(caseId);
  const reorder = useReorderEvidence(caseId);
  const update = useUpdateEvidence(caseId);
  const [role, setRole] = useState<EvidenceRole>('overview');
  const [local, setLocal] = useState<Record<string, UploadManifestEntry>>({});
  const files = useRef(new Map<string, File>());
  const [pickError, setPickError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const items = evidence.data?.evidence ?? [];
  const active = items.filter((e) => e.status !== 'rejected');
  const remaining = MEDIA_LIMITS.maxImagesPerCase - active.length - Object.values(local).filter((l) => !l.evidenceId && l.state !== 'failed').length;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: keys.evidence(caseId) });
    void qc.invalidateQueries({ queryKey: keys.case(caseId) });
  };

  async function start(entry: UploadManifestEntry) {
    const file = files.current.get(entry.localId) ?? null;
    await runUpload(
      api,
      entry,
      file ? { mime: entry.mime, bytes: entry.bytes, read: async () => file } : null,
      (next) => {
        setLocal((m) => ({ ...m, [next.localId]: next }));
        if (next.evidenceId) refresh();
      },
    );
    refresh();
  }

  function onPick(list: FileList | null) {
    setPickError(null);
    if (!list?.length) return;
    const picked = Array.from(list).slice(0, Math.max(0, remaining));
    if (list.length > picked.length) setPickError(`Only ${MEDIA_LIMITS.maxImagesPerCase} photos fit in one case. Some were not added.`);
    for (const file of picked) {
      const mime = normalizeMime(file.type, file.name);
      const problem = prevalidate(mime, file.size);
      const entry: UploadManifestEntry = {
        localId: randomId(),
        idempotencyKey: randomId(),
        caseId,
        role,
        mime,
        bytes: file.size,
        state: problem ? 'failed' : 'queued',
        error: problem ?? undefined,
        updatedAt: new Date().toISOString(),
      };
      files.current.set(entry.localId, file);
      setLocal((m) => ({ ...m, [entry.localId]: entry }));
      if (!problem) void start(entry);
    }
  }

  const localOnly = Object.values(local).filter((l) => l.state !== 'done' && !(l.evidenceId && items.some((e) => e.id === l.evidenceId && e.status !== 'pending_upload')));

  const move = (item: EvidenceItem, dir: -1 | 1) => {
    const order = active.map((e) => e.id);
    const i = order.indexOf(item.id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j]!, order[i]!];
    reorder.mutate(order);
  };

  return (
    <div className="flex flex-col gap-4">
      {!disabled ? (
        <div className="rounded-[14px] border border-border bg-surface p-4">
          <fieldset>
            <legend className="font-semibold">What does the next photo show?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {EvidenceRole.options.map((r) => (
                <label key={r} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 ${role === r ? 'border-accent bg-accent-subtle' : 'border-border'}`}>
                  <input type="radio" name="photo-role" className="size-4" checked={role === r} onChange={() => setRole(r)} />
                  {EVIDENCE_ROLE_LABELS[r]}
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted">{ROLE_HELP[role]}</p>
          </fieldset>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" icon={Camera} onClick={() => cameraInput.current?.click()} disabled={remaining <= 0}>
              Take a photo
            </Button>
            <Button type="button" variant="secondary" icon={ImagePlus} onClick={() => libraryInput.current?.click()} disabled={remaining <= 0}>
              Choose photos
            </Button>
          </div>
          {/* Camera capture where supported; if camera access is denied the browser falls back to choosing a file. */}
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onPick(e.target.files); e.target.value = ''; }} />
          <input ref={libraryInput} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onPick(e.target.files); e.target.value = ''; }} />
          <p className="mt-2 text-sm text-muted">
            JPEG, PNG, WebP or HEIC, up to 15 MB each. {Math.max(0, remaining)} of {MEDIA_LIMITS.maxImagesPerCase} photo slots left. Never approach moving or hot parts for a photo.
          </p>
          {pickError ? <div className="mt-3"><Alert tone="warning" title="Some photos were not added">{pickError}</Alert></div> : null}
        </div>
      ) : null}

      {localOnly.length ? (
        <ul className="flex flex-col gap-2" aria-label="Uploads in progress">
          {localOnly.map((l) => (
            <li key={l.localId} className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-border bg-raised p-3">
              <span className="min-w-0">
                <span className="font-medium">{files.current.get(l.localId)?.name ?? 'Photo'}</span>
                <span className="block text-sm text-muted" aria-live="polite">
                  {l.state === 'failed' ? l.error : l.state === 'needs_reselect' ? l.error : l.state === 'completing' ? 'Finishing…' : 'Uploading…'}
                </span>
              </span>
              {l.state === 'failed' && !prevalidate(l.mime, l.bytes) ? (
                <Button variant="secondary" icon={RefreshCw} onClick={() => void start(l)}>Retry</Button>
              ) : l.state === 'failed' ? (
                <Button variant="ghost" onClick={() => setLocal((m) => { const n = { ...m }; delete n[l.localId]; return n; })}>Dismiss</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {evidence.isPending ? <Loading label="Loading photos" /> : evidence.isError ? <ErrorState error={evidence.error} onRetry={() => evidence.refetch()} /> : null}
      {remove.isError ? <ErrorState title="Photo not removed" error={remove.error} /> : null}

      {items.length === 0 && !evidence.isPending ? <p className="text-muted">No photos yet.</p> : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((e, idx) => (
          <li key={e.id} className="flex gap-3 rounded-[12px] border border-border bg-raised p-3">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-sunken">
              {e.thumb ? (
                <img src={e.thumb.url} alt={`${EVIDENCE_ROLE_LABELS[e.role]} photo ${idx + 1}`} className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-muted" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <EvidenceStatusPill status={e.status} />
              </div>
              {e.status === 'rejected' && e.rejectionReason ? <p className="text-sm">{REJECTION_MESSAGES[e.rejectionReason]}</p> : null}
              {e.status === 'failed' ? <p className="text-sm">We could not process this photo. Remove it and add it again.</p> : null}
              {e.status === 'pending_upload' && !localOnly.some((l) => l.evidenceId === e.id) ? (
                <p className="text-sm">This upload did not finish. Remove it and add the photo again.</p>
              ) : null}
              <label className="text-sm">
                <span className="sr-only">Photo type</span>
                <select
                  className="min-h-11 w-full rounded-[10px] border border-border-strong bg-surface px-2"
                  value={e.role}
                  disabled={disabled}
                  onChange={(ev) => update.mutate({ id: e.id, input: { role: ev.target.value as EvidenceRole } })}
                >
                  {EvidenceRole.options.map((r) => <option key={r} value={r}>{EVIDENCE_ROLE_LABELS[r]}</option>)}
                </select>
              </label>
              {!disabled ? (
                <div className="flex flex-wrap gap-1">
                  {e.status !== 'rejected' ? (
                    <>
                      <Button variant="ghost" aria-label="Move earlier" icon={ArrowUp} onClick={() => move(e, -1)} disabled={active[0]?.id === e.id} />
                      <Button variant="ghost" aria-label="Move later" icon={ArrowDown} onClick={() => move(e, 1)} disabled={active.at(-1)?.id === e.id} />
                    </>
                  ) : null}
                  <ConfirmDialog
                    trigger={<Button variant="ghost" icon={Trash2}>Remove</Button>}
                    title="Remove this photo?"
                    description="The photo and its copies are deleted from your case."
                    confirmLabel="Remove photo"
                    onConfirm={() => remove.mutate(e.id)}
                  />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
