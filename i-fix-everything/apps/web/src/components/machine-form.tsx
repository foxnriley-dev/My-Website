'use client';

import { randomId } from '@ife/api-client';
import {
  COMPONENT_KIND_LABELS,
  ComponentKind,
  IDENTITY_FIELD_LABELS,
  MACHINE_CATEGORY_LABELS,
  MachineCategory,
  POWER_TYPE_LABELS,
  PowerType,
  type IdentityFieldKey,
  type InstalledComponent,
  type MachineIdentity,
  type MachineIdentityInput,
  type Modification,
} from '@ife/contracts';
import { emptyIdentity, RELEVANT_FIELDS, userField } from '@ife/domain';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Alert, Button, ChoiceList, Field, inputClass } from './ui';

export interface MachineFormValue extends MachineIdentityInput {
  category: MachineCategory;
  nickname: string;
}

export function newMachineValue(): MachineFormValue {
  return { category: 'small_engine', nickname: '', identity: emptyIdentity(), installedComponents: [], modifications: [] };
}

const HINTS: Partial<Record<IdentityFieldKey, string>> = {
  engineIdentifier: 'Often on a label or stamped on the engine (model / type / code). Leave it unknown if you cannot see it safely.',
  serialOrVin: 'Cars: 17-character VIN. Small engines: the serial on the engine label.',
  year: 'Only if you know it. Do not guess.',
};

function IdentityInput({
  k,
  identity,
  onChange,
}: {
  k: IdentityFieldKey;
  identity: MachineIdentity;
  onChange: (next: MachineIdentity) => void;
}) {
  const f = identity[k];
  const unknown = f.state !== 'known';
  const [draft, setDraft] = useState(f.value ?? '');
  const set = (value: string, isUnknown: boolean) => onChange({ ...identity, [k]: isUnknown ? { ...emptyIdentity()[k] } : userField(value) });

  return (
    <Field label={IDENTITY_FIELD_LABELS[k]} hint={HINTS[k]}>
      {(p) => (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {k === 'powerType' ? (
            <select
              {...p}
              className={inputClass}
              value={unknown ? '' : (f.value ?? '')}
              onChange={(e) => set(e.target.value, e.target.value === '')}
            >
              <option value="">Not sure</option>
              {PowerType.options.map((o) => (
                <option key={o} value={o}>
                  {POWER_TYPE_LABELS[o]}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                {...p}
                className={inputClass}
                value={unknown ? '' : draft}
                placeholder={unknown ? 'Unknown' : undefined}
                onChange={(e) => {
                  setDraft(e.target.value);
                  set(e.target.value, e.target.value.trim() === '');
                }}
                maxLength={120}
                autoComplete="off"
              />
              {f.provenance && f.provenance !== 'user_entered' ? (
                <span className="text-sm text-muted">Source: {f.provenance.replace('_', ' ')}</span>
              ) : null}
            </>
          )}
        </div>
      )}
    </Field>
  );
}

export function MachineForm({
  initial,
  mode,
  onSubmit,
  submitting,
  error,
}: {
  initial: MachineFormValue;
  mode: 'create' | 'revise';
  onSubmit: (value: MachineFormValue, changeNote: string | null) => void;
  submitting: boolean;
  error?: React.ReactNode;
}) {
  const [v, setV] = useState<MachineFormValue>(initial);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const relevant = RELEVANT_FIELDS[v.category];
  const others = (Object.keys(IDENTITY_FIELD_LABELS) as IdentityFieldKey[]).filter((k) => !relevant.includes(k));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.nickname.trim()) return setFormError('Give it a name you will recognize, like "Red mower".');
    setFormError(null);
    onSubmit(v, note.trim() || null);
  };

  const setComponent = (i: number, patch: Partial<InstalledComponent>) =>
    setV({ ...v, installedComponents: v.installedComponents.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setMod = (i: number, patch: Partial<Modification>) =>
    setV({ ...v, modifications: v.modifications.map((m, j) => (j === i ? { ...m, ...patch } : m)) });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      {error}
      {formError ? <Alert tone="danger" role="alert" title="Check the form">{formError}</Alert> : null}

      {mode === 'create' ? (
        <ChoiceList
          legend="What kind of machine is it?"
          name="category"
          options={MachineCategory.options.map((c) => ({ value: c, label: MACHINE_CATEGORY_LABELS[c] }))}
          value={v.category}
          onChange={(category) => setV({ ...v, category })}
        />
      ) : null}

      {mode === 'create' ? (
        <Field label="Nickname" hint="Just for you, e.g. “Dad’s mower” or “Blue kart”.">
          {(p) => <input {...p} className={inputClass} value={v.nickname} maxLength={80} onChange={(e) => setV({ ...v, nickname: e.target.value })} />}
        </Field>
      ) : null}

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-lg font-bold">Factory details</legend>
        <p className="-mt-2 text-sm text-muted">Leave anything you are not sure about empty — it will be saved as unknown.</p>
        {relevant.map((k) => (
          <IdentityInput key={k} k={k} identity={v.identity} onChange={(identity) => setV({ ...v, identity })} />
        ))}
        <details className="rounded-[10px] border border-border p-3">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">More details (optional)</summary>
          <div className="mt-3 flex flex-col gap-4">
            {others.map((k) => (
              <IdentityInput key={k} k={k} identity={v.identity} onChange={(identity) => setV({ ...v, identity })} />
            ))}
          </div>
        </details>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Installed engine, motor or swapped parts</legend>
        <p className="-mt-2 text-sm text-muted">Add the engine or motor if it is not the original, or if you know its details.</p>
        {v.installedComponents.map((c, i) => (
          <div key={c.id} className="grid gap-3 rounded-[12px] border border-border p-3 sm:grid-cols-2">
            <Field label="Part">
              {(p) => (
                <select {...p} className={inputClass} value={c.kind} onChange={(e) => setComponent(i, { kind: e.target.value as ComponentKind })}>
                  {ComponentKind.options.map((o) => (
                    <option key={o} value={o}>{COMPONENT_KIND_LABELS[o]}</option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Make">{(p) => <input {...p} className={inputClass} value={c.make ?? ''} maxLength={120} onChange={(e) => setComponent(i, { make: e.target.value || null })} />}</Field>
            <Field label="Model">{(p) => <input {...p} className={inputClass} value={c.model ?? ''} maxLength={120} onChange={(e) => setComponent(i, { model: e.target.value || null })} />}</Field>
            <Field label="ID or code on the label">{(p) => <input {...p} className={inputClass} value={c.identifier ?? ''} maxLength={120} onChange={(e) => setComponent(i, { identifier: e.target.value || null })} />}</Field>
            <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
              <input type="checkbox" className="size-5" checked={c.replacesFactory} onChange={(e) => setComponent(i, { replacesFactory: e.target.checked })} />
              Not the original part (swapped or replaced)
            </label>
            <div className="sm:col-span-2">
              <Button type="button" variant="ghost" icon={Trash2} onClick={() => setV({ ...v, installedComponents: v.installedComponents.filter((_, j) => j !== i) })}>
                Remove this part
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            icon={Plus}
            onClick={() =>
              setV({
                ...v,
                installedComponents: [
                  ...v.installedComponents,
                  { id: randomId(), kind: 'engine', make: null, model: null, identifier: null, replacesFactory: false, notes: null, provenance: 'user_entered' },
                ],
              })
            }
          >
            Add engine, motor or part
          </Button>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Modifications</legend>
        {v.modifications.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label={`Modification ${i + 1}`}>
                {(p) => <input {...p} className={inputClass} value={m.description} maxLength={1000} onChange={(e) => setMod(i, { description: e.target.value })} />}
              </Field>
            </div>
            <Button type="button" variant="ghost" icon={Trash2} aria-label={`Remove modification ${i + 1}`} onClick={() => setV({ ...v, modifications: v.modifications.filter((_, j) => j !== i) })}>
              Remove
            </Button>
          </div>
        ))}
        <div>
          <Button
            type="button"
            variant="secondary"
            icon={Plus}
            onClick={() => setV({ ...v, modifications: [...v.modifications, { id: randomId(), description: '', provenance: 'user_entered' }] })}
          >
            Add a modification
          </Button>
        </div>
      </fieldset>

      {mode === 'revise' ? (
        <Field label="What changed? (optional)" hint="Saved with this version of the details.">
          {(p) => <input {...p} className={inputClass} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />}
        </Field>
      ) : null}

      <div className="sticky bottom-20 z-10 md:static">
        <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto">
          {mode === 'create' ? 'Save machine' : 'Save new details'}
        </Button>
      </div>
    </form>
  );
}

/** Drop empty modification rows so validation does not reject a half-filled form. */
export function cleanMachineValue(v: MachineFormValue): MachineFormValue {
  return { ...v, nickname: v.nickname.trim(), modifications: v.modifications.filter((m) => m.description.trim()) };
}
