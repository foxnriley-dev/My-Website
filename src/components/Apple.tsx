import { Check } from 'lucide-react'

const points = [
  'Member of the Apple Consultants Network',
  'Team made up of former Apple employees',
  'Macs, iPhones, and iPads set up right the first time',
  'Ongoing help after purchase, not just at setup',
  'iPhone-controlled security, locks, and climate',
]

export function Apple() {
  return (
    <section id="apple" className="relative bg-bg py-28 sm:py-36">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1.1fr_1fr]">
        <div data-reveal>
          <p className="eyebrow mb-4">Apple</p>
          <h2 className="h2">A close relationship with Apple, and the experience to show for it.</h2>
          <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-muted">
            Our team knows Apple from the inside. Whether you are rolling out a fleet of Macs or setting up a single iPhone, we get it
            configured properly from day one and stay with you afterward.
          </p>
        </div>
        <ul className="card divide-y divide-line p-2" data-reveal>
          {points.map((p) => (
            <li key={p} className="flex items-center gap-4 px-4 py-4 text-[15px]">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                <Check className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
