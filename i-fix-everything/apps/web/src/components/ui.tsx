'use client';

import { errorMessage } from '@ife/api-client';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Info,
  Loader2,
  OctagonAlert,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { forwardRef, useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-raised text-text border border-border-strong hover:bg-sunken',
  ghost: 'text-text hover:bg-sunken',
  danger: 'bg-danger text-inverse hover:opacity-90',
};

export const buttonClass = (variant: Variant = 'primary', size: 'md' | 'lg' = 'md') =>
  cx(
    'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
    size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-11 px-4 text-[15px]',
    variants[variant],
  );

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg'; loading?: boolean; icon?: LucideIcon }
>(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, ...rest }, ref) {
  return (
    <button ref={ref} className={cx(buttonClass(variant, size), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function LinkButton({ href, variant = 'primary', size = 'md', className, children, icon: Icon }: { href: string; variant?: Variant; size?: 'md' | 'lg'; className?: string; children: ReactNode; icon?: LucideIcon }) {
  return (
    <Link href={href} className={cx(buttonClass(variant, size), className)}>
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {children}
    </Link>
  );
}

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <As className={cx('rounded-[14px] border border-border bg-raised p-4 sm:p-5', className)} {...rest}>
      {children}
    </As>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
        {subtitle ? <div className="mt-1 text-muted">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';
const toneStyles: Record<Tone, { box: string; icon: LucideIcon }> = {
  info: { box: 'bg-info-subtle border-info text-text', icon: Info },
  success: { box: 'bg-success-subtle border-success text-text', icon: CheckCircle2 },
  warning: { box: 'bg-warning-subtle border-warning text-text', icon: AlertTriangle },
  danger: { box: 'bg-danger-subtle border-danger text-text', icon: OctagonAlert },
  neutral: { box: 'bg-sunken border-border text-text', icon: CircleDashed },
};
const toneIconColor: Record<Tone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-muted',
};

/** Status meaning is carried by icon + text, never color alone. */
export function Alert({ tone = 'info', title, children, action, role }: { tone?: Tone; title: string; children?: ReactNode; action?: ReactNode; role?: 'alert' | 'status' }) {
  const { box, icon: Icon } = toneStyles[tone];
  return (
    <div role={role} className={cx('flex gap-3 rounded-[12px] border-l-4 border p-4', box)}>
      <Icon className={cx('mt-0.5 size-5 shrink-0', toneIconColor[tone])} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-1 text-[15px] text-text">{children}</div> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function StatusPill({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: ReactNode }) {
  const bg: Record<Tone, string> = {
    info: 'bg-info-subtle',
    success: 'bg-success-subtle',
    warning: 'bg-warning-subtle',
    danger: 'bg-danger-subtle',
    neutral: 'bg-sunken',
  };
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-medium', bg[tone])}>
      <Icon className={cx('size-3.5', toneIconColor[tone])} aria-hidden />
      {children}
    </span>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'This did not load' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert
      tone="danger"
      role="alert"
      title={title}
      action={
        onRetry ? (
          <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[14px] border border-dashed border-border-strong bg-surface px-6 py-10 text-center">
      <Icon className="size-10 text-muted" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold">{title}</h2>
      {children ? <div className="mt-1 max-w-md text-muted">{children}</div> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errId} className="flex items-center gap-1 text-sm font-medium text-danger">
          <OctagonAlert className="size-4" aria-hidden /> {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClass =
  'min-h-11 w-full rounded-[10px] border border-border-strong bg-surface px-3 py-2 text-text placeholder:text-muted aria-[invalid=true]:border-danger';

/** Single choice from a short list, rendered as large native radio rows. */
export function ChoiceList<T extends string>({
  legend,
  hint,
  options,
  value,
  onChange,
  name,
}: {
  legend: string;
  hint?: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  name: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 font-semibold">{legend}</legend>
      {hint ? <p className="-mt-1 mb-1 text-sm text-muted">{hint}</p> : null}
      {options.map((o) => (
        <label
          key={o.value}
          className={cx(
            'flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-2',
            value === o.value ? 'border-accent bg-accent-subtle' : 'border-border bg-surface hover:bg-sunken',
          )}
        >
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="size-5 accent-[var(--ife-accent)]" />
          <span>{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-raised p-5 shadow-xl">
          <AlertDialog.Title className="text-lg font-bold">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-muted">{description}</div>
          </AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
