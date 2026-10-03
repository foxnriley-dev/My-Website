import { ArrowUpRight, Headset, ClipboardCheck, UserRound } from 'lucide-react'
import { contact } from '../content'

const items = [
  {
    id: 'helpdesk',
    icon: Headset,
    title: 'Helpdesk',
    body: 'Already a client? Start a remote support session and a technician will connect to your computer.',
    cta: 'Start remote support',
    href: contact.remoteSupport,
    external: true,
  },
  {
    id: 'check-in',
    icon: ClipboardCheck,
    title: 'Check-in',
    body: `Bring your device to our Tempe office at ${contact.address} and we will check it in for service.`,
    cta: 'Get directions',
    href: contact.mapsUrl,
    external: true,
  },
  {
    id: 'customer-portal',
    icon: UserRound,
    title: 'Customer Portal',
    body: 'Sign in to view tickets, invoices, and the status of your repairs.',
    cta: 'Sign in',
    href: contact.customerPortal,
    external: true,
  },
]

export function Support() {
  return (
    <section id="support" className="border-t border-line bg-bg py-28 sm:py-32">
      <div className="container-x">
        <div className="mb-12 max-w-2xl" data-reveal>
          <p className="eyebrow mb-4">Support</p>
          <h2 className="h2">Need help right now?</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3" data-stagger>
          {items.map(({ id, icon: I, title, body, cta, href, external }) => (
            <a
              key={id}
              id={id}
              href={href}
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              data-stagger-item
              className="card group flex flex-col p-7 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift"
            >
              <I className="mb-8 h-6 w-6 text-accent" strokeWidth={1.6} aria-hidden />
              <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{body}</p>
              <span className="mt-8 inline-flex items-center gap-1.5 text-[14px] font-medium">
                <span className="link-u">{cta}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
