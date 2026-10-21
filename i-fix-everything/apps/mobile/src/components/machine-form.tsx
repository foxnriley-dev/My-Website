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
  type MachineIdentityInput,
} from '@ife/contracts';
import { emptyIdentity, RELEVANT_FIELDS, userField } from '@ife/domain';
import { useState } from 'react';
import { View } from 'react-native';
import { Body, Button, Card, Choice, H2, Notice, TextField, Toggle } from './ui';

export interface MachineFormValue extends MachineIdentityInput {
  category: MachineCategory;
  nickname: string;
}

export const newMachineValue = (): MachineFormValue => ({
  category: 'small_engine',
  nickname: '',
  identity: emptyIdentity(),
  installedComponents: [],
  modifications: [],
});

export const cleanMachineValue = (v: MachineFormValue): MachineFormValue => ({
  ...v,
  nickname: v.nickname.trim(),
  modifications: v.modifications.filter((m) => m.description.trim()),
});

const HINTS: Partial<Record<IdentityFieldKey, string>> = {
  engineIdentifier: 'Often on a label or stamped on the engine. Leave empty if you cannot see it safely.',
  serialOrVin: 'Cars: 17-character VIN. Small engines: the serial on the engine label.',
  year: 'Only if you know it. Do not guess.',
};

export function MachineForm({
  initial,
  mode,
  onSubmit,
  submitting,
  error,
}: {
  initial: MachineFormValue;
  mode: 'create' | 'revise';
  onSubmit: (v: MachineFormValue, note: string | null) => void;
  submitting: boolean;
  error?: React.ReactNode;
}) {
  const [v, setV] = useState(initial);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const relevant = RELEVANT_FIELDS[v.category];
  const others = (Object.keys(IDENTITY_FIELD_LABELS) as IdentityFieldKey[]).filter((k) => !relevant.includes(k));

  const field = (k: IdentityFieldKey) =>
    k === 'powerType' ? (
      <Choice
        key={k}
        legend={IDENTITY_FIELD_LABELS[k]}
        options={[{ value: '' as string, label: 'Not sure' }, ...PowerType.options.map((o) => ({ value: o as string, label: POWER_TYPE_LABELS[o] }))]}
        value={v.identity.powerType.value ?? ''}
        onChange={(val) => setV({ ...v, identity: { ...v.identity, powerType: userField(val) } })}
      />
    ) : (
      <TextField
        key={k}
        label={IDENTITY_FIELD_LABELS[k]}
        hint={HINTS[k]}
        placeholder="Unknown"
        value={v.identity[k].value ?? ''}
        maxLength={120}
        autoCapitalize={k === 'serialOrVin' || k === 'engineIdentifier' ? 'characters' : 'words'}
        onChangeText={(text) => setV({ ...v, identity: { ...v.identity, [k]: userField(text) } })}
      />
    );

  const setComponent = (i: number, patch: Partial<InstalledComponent>) =>
    setV({ ...v, installedComponents: v.installedComponents.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  return (
    <View style={{ gap: 16 }}>
      {error}
      {formError ? <Notice tone="danger" title="Check the form">{formError}</Notice> : null}
      {mode === 'create' ? (
        <>
          <Choice
            legend="What kind of machine is it?"
            options={MachineCategory.options.map((c) => ({ value: c, label: MACHINE_CATEGORY_LABELS[c] }))}
            value={v.category}
            onChange={(category) => setV({ ...v, category })}
          />
          <TextField label="Nickname" hint="Just for you, e.g. “Dad’s mower”." value={v.nickname} maxLength={80} onChangeText={(nickname) => setV({ ...v, nickname })} testID="nickname" />
        </>
      ) : null}
      <Card>
        <H2>Factory details</H2>
        <Body muted>Leave anything you are not sure about empty — it is saved as unknown.</Body>
        {relevant.map(field)}
        <Button label={showMore ? 'Hide extra details' : 'More details (optional)'} variant="ghost" onPress={() => setShowMore(!showMore)} />
        {showMore ? others.map(field) : null}
      </Card>
      <Card>
        <H2>Installed engine, motor or swapped parts</H2>
        {v.installedComponents.map((c, i) => (
          <View key={c.id} style={{ gap: 8, paddingVertical: 8 }}>
            <Choice
              legend={`Part ${i + 1}`}
              options={ComponentKind.options.map((o) => ({ value: o, label: COMPONENT_KIND_LABELS[o] }))}
              value={c.kind}
              onChange={(kind) => setComponent(i, { kind })}
            />
            <TextField label="Make" value={c.make ?? ''} onChangeText={(t) => setComponent(i, { make: t || null })} />
            <TextField label="Model" value={c.model ?? ''} onChangeText={(t) => setComponent(i, { model: t || null })} />
            <TextField label="ID or code on the label" value={c.identifier ?? ''} onChangeText={(t) => setComponent(i, { identifier: t || null })} />
            <Toggle label="Not the original part (swapped or replaced)" value={c.replacesFactory} onChange={(replacesFactory) => setComponent(i, { replacesFactory })} />
            <Button label="Remove this part" icon="trash" variant="ghost" onPress={() => setV({ ...v, installedComponents: v.installedComponents.filter((_, j) => j !== i) })} />
          </View>
        ))}
        <Button
          label="Add engine, motor or part"
          icon="add"
          variant="secondary"
          onPress={() =>
            setV({
              ...v,
              installedComponents: [
                ...v.installedComponents,
                { id: randomId(), kind: 'engine', make: null, model: null, identifier: null, replacesFactory: false, notes: null, provenance: 'user_entered' },
              ],
            })
          }
        />
      </Card>
      <Card>
        <H2>Modifications</H2>
        {v.modifications.map((m, i) => (
          <View key={m.id} style={{ gap: 8 }}>
            <TextField
              label={`Modification ${i + 1}`}
              value={m.description}
              onChangeText={(description) => setV({ ...v, modifications: v.modifications.map((x, j) => (j === i ? { ...x, description } : x)) })}
            />
            <Button label="Remove" variant="ghost" icon="trash" onPress={() => setV({ ...v, modifications: v.modifications.filter((_, j) => j !== i) })} />
          </View>
        ))}
        <Button label="Add a modification" icon="add" variant="secondary" onPress={() => setV({ ...v, modifications: [...v.modifications, { id: randomId(), description: '', provenance: 'user_entered' }] })} />
      </Card>
      {mode === 'revise' ? <TextField label="What changed? (optional)" value={note} maxLength={500} onChangeText={setNote} /> : null}
      <Button
        label={mode === 'create' ? 'Save machine' : 'Save new details'}
        loading={submitting}
        testID="save-machine"
        onPress={() => {
          if (!v.nickname.trim()) return setFormError('Give it a name you will recognize.');
          setFormError(null);
          onSubmit(v, note.trim() || null);
        }}
      />
    </View>
  );
}
