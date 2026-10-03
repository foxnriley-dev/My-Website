import { capabilities } from '../content'

export function Capabilities({ reduced }: { reduced: boolean }) {
  if (reduced) {
    return (
      <section aria-label="Capabilities" className="border-y border-line bg-bg/60 py-8 backdrop-blur-sm">
        <ul className="container-x flex flex-wrap justify-center gap-x-8 gap-y-3 text-[15px] text-muted">
          {capabilities.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>
    )
  }
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {capabilities.map((c) => (
        <li key={c} className="flex items-center whitespace-nowrap px-6 text-[15px] text-muted sm:text-[17px]">
          {c}
          <span className="ml-12 h-1 w-1 rounded-full bg-accent/70" aria-hidden />
        </li>
      ))}
    </ul>
  )
  return (
    <section aria-label="Capabilities" className="marquee relative border-y border-line bg-bg/60 py-7 backdrop-blur-sm">
      <div className="mask-fade-x overflow-hidden">
        <div className="marquee-track flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  )
}
