import { pillars } from '../content'
import { Icon } from './Icon'

export function Why() {
  return (
    <section id="about" className="border-t border-line bg-bg py-28 sm:py-36">
      <div className="container-x">
        <div className="max-w-2xl" data-reveal>
          <p className="eyebrow mb-4">Why SuperCru</p>
          <h2 className="h2">Your local I.T. department, without hiring one.</h2>
          <p className="mt-5 text-[17px] leading-relaxed text-muted">
            SuperCru is an IT support and managed services company based in Tempe. We help growing Arizona businesses choose, set up,
            and look after the technology they depend on.
          </p>
        </div>
        <div className="mt-16 grid gap-4 md:grid-cols-3" data-stagger>
          {pillars.map((p) => (
            <div key={p.title} className="card p-7" data-stagger-item>
              <span className="mb-10 grid h-12 w-12 place-items-center rounded-[12px] bg-accent-soft text-accent">
                <Icon name={p.icon} className="h-6 w-6" />
              </span>
              <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{p.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
