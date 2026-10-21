'use client';

import { CircleUser, ClipboardList, Home, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/brand';
import { cx } from '@/components/ui';
import { OfflineBanner } from './offline';

const NAV = [
  { href: '/app', label: 'Home', icon: Home, exact: true },
  { href: '/app/garage', label: 'Garage', icon: Warehouse },
  { href: '/app/cases', label: 'Repairs', icon: ClipboardList },
  { href: '/app/account', label: 'Account', icon: CircleUser },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(`${href}/`));
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <BrandMark href="/app" />
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active(n.href, n.exact) ? 'page' : undefined}
                    className={cx(
                      'inline-flex min-h-11 items-center gap-2 rounded-[10px] px-3 font-semibold',
                      active(n.href, n.exact) ? 'bg-accent-subtle text-text' : 'text-muted hover:bg-sunken hover:text-text',
                    )}
                  >
                    <n.icon className="size-4" aria-hidden />
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <OfflineBanner />
      </header>

      <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12">
        {children}
      </main>

      {/* Phone: primary navigation within thumb reach. */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active(n.href, n.exact) ? 'page' : undefined}
                className={cx(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold',
                  active(n.href, n.exact) ? 'text-accent' : 'text-muted',
                )}
              >
                <n.icon className="size-5" aria-hidden />
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
