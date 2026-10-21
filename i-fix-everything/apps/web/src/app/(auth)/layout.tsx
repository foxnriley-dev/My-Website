import { BrandMark } from '@/components/brand';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <BrandMark />
      </header>
      <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-md px-4 pb-16 pt-6">
        {children}
      </main>
    </div>
  );
}
