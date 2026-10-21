import { BRAND } from '@ife/domain';
import { Camera, ClipboardList, FolderClock, ShieldAlert, Wrench } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand';

const steps = [
  { icon: Wrench, title: 'Add your machine', body: 'Make, model and engine if you know them. "Not sure" is a fine answer — we track what is known and what is not.' },
  { icon: Camera, title: 'Add photos', body: 'A wide shot, a close-up of the problem, and the label or tag if you can see one safely.' },
  { icon: ClipboardList, title: 'Describe what happens', body: 'Plain words are fine. We ask a few follow-up questions, including safety checks.' },
  { icon: FolderClock, title: 'Come back any time', body: 'Your case is saved to your account and picks up where you left off on the web, iPhone or Android.' },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <BrandMark />
        <nav aria-label="Account" className="flex items-center gap-1">
          <Link href="/sign-in" className="inline-flex min-h-11 items-center rounded-[10px] px-3 font-semibold hover:bg-sunken">
            Sign in
          </Link>
          <Link href="/sign-up" className="inline-flex min-h-11 items-center rounded-[10px] bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover">
            Start a repair
          </Link>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="outline-none mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="grid gap-10 py-10 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-16">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1 text-sm font-medium text-muted">
              Invite-only beta
            </p>
            <h1 className="text-[34px] font-bold leading-tight tracking-tight sm:text-5xl">
              Figure out what is wrong with your machine — and what to check next.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              {BRAND.productName} is a repair companion for cars, motorcycles, go karts, mini bikes, motorized bicycles and small
              engine equipment. Take photos, describe the problem in your own words, and keep everything about the repair in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/sign-up" className="inline-flex min-h-12 items-center rounded-[10px] bg-accent px-5 font-semibold text-on-accent hover:bg-accent-hover">
                Start a repair
              </Link>
              <a href="#sample" className="inline-flex min-h-12 items-center rounded-[10px] border border-border-strong bg-raised px-5 font-semibold hover:bg-sunken">
                See a sample case
              </a>
            </div>
          </div>

          <div id="sample" className="rounded-[16px] border border-border bg-raised p-5 shadow-sm" aria-labelledby="sample-title">
            <p className="mb-3 inline-flex items-center rounded-full bg-warning-subtle px-2.5 py-1 text-[13px] font-semibold">
              Sample — made-up example, not a real customer
            </p>
            <h2 id="sample-title" className="text-lg font-bold">Pull-start mower won’t start after winter</h2>
            <p className="text-sm text-muted">Small engine · engine model unknown</p>
            <dl className="mt-4 grid gap-3 text-[15px]">
              <div>
                <dt className="font-semibold">What happens when you try to start it?</dt>
                <dd className="text-muted">It turns over but will not start.</dd>
              </div>
              <div>
                <dt className="font-semibold">Photos</dt>
                <dd className="text-muted">Whole machine · close-up of the carburetor area · engine label</dd>
              </div>
              <div>
                <dt className="font-semibold">Safety checks</dt>
                <dd className="text-muted">No fuel leak or smell · no smoke · nothing damaged</dd>
              </div>
              <div>
                <dt className="font-semibold">Machine details still unknown</dt>
                <dd className="text-muted">Engine model — the label photo may help identify it.</dd>
              </div>
            </dl>
          </div>
        </section>

        <section aria-labelledby="how" className="py-8">
          <h2 id="how" className="text-2xl font-bold">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-[14px] border border-border bg-raised p-4">
                <s.icon className="size-6 text-accent" aria-hidden />
                <h3 className="mt-3 font-semibold">
                  {i + 1}. {s.title}
                </h3>
                <p className="mt-1 text-[15px] text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="scope" className="grid gap-4 py-8 md:grid-cols-2">
          <div className="rounded-[14px] border border-border bg-raised p-5">
            <h2 id="scope" className="text-xl font-bold">What works in this beta</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
              <li>Your garage: machines with known and unknown details, engine swaps and modifications.</li>
              <li>Repair cases with photos, symptoms and safety checks, saved privately to your account.</li>
              <li>The same account on the website, iPhone and Android.</li>
            </ul>
            <h3 className="mt-5 font-semibold">Coming next, not available yet</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>Evidence-based assessment and follow-up questions.</li>
              <li>Compatible parts, buying links, repair guides and relevant videos — only where reliable sources support them.</li>
            </ul>
          </div>
          <div className="rounded-[14px] border border-border bg-raised p-5">
            <ShieldAlert className="size-6 text-warning" aria-hidden />
            <h2 className="mt-2 text-xl font-bold">Honest limits</h2>
            <p className="mt-2 text-muted">{BRAND.scopeNote}</p>
            <p className="mt-2 text-muted">
              No one can diagnose every problem from one photo. When the evidence is not enough, we will ask for more instead of guessing.
              Fuel leaks, smoke, damaged batteries and brake or steering problems are flagged for safety first.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:px-6">
          <span>© {new Date().getFullYear()} {BRAND.productName}</span>
          <Link href="/privacy" className="min-h-11 inline-flex items-center underline">
            Privacy and data
          </Link>
        </div>
      </footer>
    </>
  );
}
