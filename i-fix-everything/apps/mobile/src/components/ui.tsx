import Ionicons from '@expo/vector-icons/Ionicons';
import { errorMessage } from '@ife/api-client';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Screen({
  children,
  refreshing,
  onRefresh,
  edges = ['bottom'],
  footer,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.c.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: t.space[4], gap: t.space[4], paddingBottom: t.space[10] }}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
        {footer ? (
          <View style={{ padding: t.space[4], borderTopWidth: StyleSheet.hairlineWidth, borderColor: t.c.border, backgroundColor: t.c.surface }}>{footer}</View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" maxFontSizeMultiplier={2} style={{ color: t.c.text, fontSize: t.fontSize['2xl'], lineHeight: t.lineHeight['2xl'], fontWeight: '700' }}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={{ color: t.c.text, fontSize: t.fontSize.lg, lineHeight: t.lineHeight.lg, fontWeight: '700' }}>
      {children}
    </Text>
  );
}

export function Body({ children, muted, style }: { children: ReactNode; muted?: boolean; style?: TextStyle }) {
  const t = useTheme();
  return <Text style={[{ color: muted ? t.c.textMuted : t.c.text, fontSize: t.fontSize.md, lineHeight: t.lineHeight.md }, style]}>{children}</Text>;
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
}) {
  const t = useTheme();
  const bg = { primary: t.c.accent, secondary: t.c.surfaceRaised, ghost: 'transparent', danger: t.c.danger }[variant];
  const fg = { primary: t.c.accentText, secondary: t.c.text, ghost: t.c.text, danger: t.c.textInverse }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: t.minTouchTarget,
        paddingHorizontal: t.space[4],
        borderRadius: t.radius.md,
        backgroundColor: bg,
        borderWidth: variant === 'secondary' ? 1 : 0,
        borderColor: t.c.borderStrong,
        opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: t.space[2],
      })}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: t.fontSize.md, fontWeight: '600', textAlign: 'center' }}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.c.surfaceRaised, borderColor: t.c.border, borderWidth: 1, borderRadius: t.radius.lg, padding: t.space[4], gap: t.space[2] }, style]}>
      {children}
    </View>
  );
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Meaning carried by icon + title text, never color alone. */
export function Notice({ tone = 'info', title, children, action }: { tone?: Tone; title: string; children?: ReactNode; action?: ReactNode }) {
  const t = useTheme();
  const map: Record<Tone, [string, string, IconName]> = {
    info: [t.c.infoSubtle, t.c.info, 'information-circle'],
    success: [t.c.successSubtle, t.c.success, 'checkmark-circle'],
    warning: [t.c.warningSubtle, t.c.warning, 'warning'],
    danger: [t.c.dangerSubtle, t.c.danger, 'alert-circle'],
    neutral: [t.c.surfaceSunken, t.c.textMuted, 'ellipse-outline'],
  };
  const [bg, fg, icon] = map[tone];
  return (
    <View
      accessible
      accessibilityRole={tone === 'danger' ? 'alert' : 'summary'}
      style={{ backgroundColor: bg, borderLeftWidth: 4, borderColor: fg, borderRadius: t.radius.md, padding: t.space[4], flexDirection: 'row', gap: t.space[3] }}
    >
      <Ionicons name={icon} size={22} color={fg} accessibilityElementsHidden importantForAccessibility="no" />
      <View style={{ flex: 1, gap: t.space[1] }}>
        <Text style={{ color: t.c.text, fontWeight: '700', fontSize: t.fontSize.md }}>{title}</Text>
        {typeof children === 'string' ? <Body>{children}</Body> : children}
        {action ? <View style={{ marginTop: t.space[2] }}>{action}</View> : null}
      </View>
    </View>
  );
}

export function Pill({ tone, icon, label }: { tone: Tone; icon: IconName; label: string }) {
  const t = useTheme();
  const bg = { info: t.c.infoSubtle, success: t.c.successSubtle, warning: t.c.warningSubtle, danger: t.c.dangerSubtle, neutral: t.c.surfaceSunken }[tone];
  const fg = { info: t.c.info, success: t.c.success, warning: t.c.warning, danger: t.c.danger, neutral: t.c.textMuted }[tone];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Ionicons name={icon} size={14} color={fg} />
      <Text style={{ color: t.c.text, fontSize: t.fontSize.sm, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  const t = useTheme();
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={{ padding: t.space[8], alignItems: 'center', gap: t.space[2] }}>
      <ActivityIndicator color={t.c.accent} />
      <Body muted>{label}…</Body>
    </View>
  );
}

export function ErrorNotice({ error, onRetry, title = 'This did not load' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Notice tone="danger" title={title} action={onRetry ? <Button label="Try again" icon="refresh" variant="secondary" onPress={onRetry} /> : undefined}>
      {errorMessage(error)}
    </Notice>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: t.space[6], gap: t.space[2], borderWidth: 1, borderStyle: 'dashed', borderColor: t.c.borderStrong, borderRadius: t.radius.lg }}>
      <Ionicons name={icon} size={36} color={t.c.textMuted} />
      <H2>{title}</H2>
      {body ? <Body muted style={{ textAlign: 'center' }}>{body}</Body> : null}
      {action ? <View style={{ marginTop: t.space[2], alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function TextField({ label, hint, error, ...input }: TextInputProps & { label: string; hint?: string; error?: string | null }) {
  const t = useTheme();
  return (
    <View style={{ gap: t.space[1] }}>
      <Text nativeID={`${label}-label`} style={{ color: t.c.text, fontWeight: '600', fontSize: t.fontSize.md }}>
        {label}
      </Text>
      {hint ? <Body muted style={{ fontSize: t.fontSize.sm }}>{hint}</Body> : null}
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={t.c.textMuted}
        {...input}
        style={{
          minHeight: input.multiline ? 110 : t.minTouchTarget,
          borderWidth: 1,
          borderColor: error ? t.c.danger : t.c.borderStrong,
          borderRadius: t.radius.md,
          backgroundColor: t.c.surface,
          color: t.c.text,
          paddingHorizontal: t.space[3],
          paddingVertical: t.space[2],
          fontSize: t.fontSize.md,
          textAlignVertical: input.multiline ? 'top' : 'center',
        }}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={{ color: t.c.danger, fontWeight: '600' }}>{error}</Text> : null}
    </View>
  );
}

/** Radio-style single choice with full-row touch targets and screen-reader state. */
export function Choice<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={legend} style={{ gap: t.space[2] }}>
      <Text style={{ color: t.c.text, fontWeight: '700', fontSize: t.fontSize.md }}>{legend}</Text>
      {hint ? <Body muted style={{ fontSize: t.fontSize.sm }}>{hint}</Body> : null}
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.label}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: t.minTouchTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space[3],
              paddingHorizontal: t.space[3],
              paddingVertical: t.space[2],
              borderRadius: t.radius.md,
              borderWidth: 1,
              borderColor: selected ? t.c.accent : t.c.border,
              backgroundColor: selected ? t.c.accentSubtle : t.c.surface,
            }}
          >
            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? t.c.accent : t.c.textMuted} />
            <Text style={{ flex: 1, color: t.c.text, fontSize: t.fontSize.md }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ minHeight: t.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: t.space[3] }}
    >
      <Ionicons name={value ? 'checkbox' : 'square-outline'} size={24} color={value ? t.c.accent : t.c.textMuted} />
      <Text style={{ flex: 1, color: t.c.text, fontSize: t.fontSize.md }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space[2], alignItems: 'center' }, style]}>{children}</View>;
}
