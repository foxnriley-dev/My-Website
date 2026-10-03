import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Phone, Mail, Monitor, Check } from 'lucide-react'
import { contact } from '../content'
import { Button } from './Button'

type Errors = Partial<Record<'name' | 'email' | 'message', string>>
type Status = 'idle' | 'sending' | 'sent' | 'mailto' | 'error'

// Set VITE_CONTACT_ENDPOINT (e.g. a Formspree or Basin URL) at build time to
// POST submissions. Without it, the form opens the visitor's email app.
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT as string | undefined

function validate(d: { name: string; email: string; message: string }): Errors {
  const e: Errors = {}
  if (!d.name.trim()) e.name = 'Please enter your name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Please enter a valid email address.'
  if (d.message.trim().length < 10) e.message = 'Please tell us a little more (at least 10 characters).'
  return e
}

export function Contact() {
  const [data, setData] = useState({ name: '', email: '', message: '', company: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>('idle')

  const set = (k: keyof typeof data) => (e: { target: { value: string } }) => {
    setData((d) => ({ ...d, [k]: e.target.value }))
    if (errors[k as keyof Errors]) setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (data.company) return // honeypot
    const errs = validate(data)
    setErrors(errs)
    const first = Object.keys(errs)[0]
    if (first) {
      document.getElementById(`f-${first}`)?.focus()
      return
    }
    if (!ENDPOINT) {
      const subject = encodeURIComponent(`Website inquiry from ${data.name}`)
      const body = encodeURIComponent(`${data.message}\n\n— ${data.name} (${data.email})`)
      window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`
      setStatus('mailto')
      return
    }
    setStatus('sending')
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, message: data.message }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('sent')
      setData({ name: '', email: '', message: '', company: '' })
    } catch {
      setStatus('error')
    }
  }

  const field = (k: 'name' | 'email' | 'message', label: string, props: Record<string, unknown> = {}) => {
    const Tag = k === 'message' ? 'textarea' : 'input'
    return (
      <div>
        <label htmlFor={`f-${k}`} className="mb-2 block text-[14px] font-medium">
          {label}
        </label>
        <Tag
          id={`f-${k}`}
          name={k}
          value={data[k]}
          onChange={set(k)}
          aria-invalid={errors[k] ? true : undefined}
          aria-describedby={errors[k] ? `e-${k}` : undefined}
          className={`field ${k === 'message' ? 'min-h-[140px] resize-y' : ''}`}
          {...props}
        />
        <AnimatePresence>
          {errors[k] && (
            <motion.p
              id={`e-${k}`}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-2 text-[13px] text-[#b4534b] dark:text-[#e09a92]"
            >
              {errors[k]}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const info = [
    { icon: MapPin, label: 'Visit', value: `${contact.address}, ${contact.city}`, href: contact.mapsUrl, external: true },
    { icon: Phone, label: 'Call', value: contact.phone, href: contact.phoneHref },
    { icon: Mail, label: 'Email', value: contact.email, href: `mailto:${contact.email}` },
    { icon: Monitor, label: 'Remote support', value: 'remote.supercru.com', href: contact.remoteSupport, external: true },
  ]

  return (
    <section id="contact" className="border-t border-line bg-bg py-28 sm:py-36">
      <div className="container-x grid gap-16 lg:grid-cols-[1fr_1.15fr]">
        <div data-reveal>
          <p className="eyebrow mb-4">Contact</p>
          <h2 className="h2">Let’s talk about your technology.</h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
            Tell us what you are working with and where you want to go. We usually reply within one business day.
          </p>
          <ul className="mt-12 space-y-6">
            {info.map(({ icon: I, label, value, href, external }) => (
              <li key={label} className="flex items-start gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-line bg-elev text-accent">
                  <I className="h-[18px] w-[18px]" strokeWidth={1.6} aria-hidden />
                </span>
                <div>
                  <p className="text-[13px] text-subtle">{label}</p>
                  <a
                    href={href}
                    {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="link-u text-[16px] font-medium"
                  >
                    {value}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-6 sm:p-10" data-reveal>
          <AnimatePresence mode="wait" initial={false}>
            {status === 'sent' ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex min-h-[420px] flex-col items-center justify-center text-center"
                role="status"
              >
                <span className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
                  <Check className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="text-[22px] font-semibold tracking-[-0.02em]">Message sent</h3>
                <p className="mt-2 max-w-xs text-muted">Thanks for reaching out. We will get back to you shortly.</p>
                <Button variant="secondary" className="mt-8" onClick={() => setStatus('idle')}>
                  Send another
                </Button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={onSubmit} className="space-y-6" exit={{ opacity: 0 }}>
                {field('name', 'Name', { autoComplete: 'name', placeholder: 'Jane Smith' })}
                {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'jane@company.com' })}
                {field('message', 'How can we help?', { rows: 5, placeholder: 'Tell us about your setup or project…' })}
                <div className="hidden" aria-hidden>
                  <label>
                    Company
                    <input tabIndex={-1} autoComplete="off" value={data.company} onChange={set('company')} />
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Sending…' : 'Send message'}
                  </Button>
                  <p className="text-[13px] text-subtle" role="status" aria-live="polite">
                    {status === 'mailto' && 'Your email app should open with the message ready to send.'}
                    {status === 'error' && (
                      <>
                        Something went wrong. Email us at{' '}
                        <a className="link-u text-fg" href={`mailto:${contact.email}`}>
                          {contact.email}
                        </a>
                        .
                      </>
                    )}
                  </p>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
