// All site copy and links live here so they can be edited in one place.

export const contact = {
  address: '1605 W University Dr Ste 109',
  city: 'Tempe, AZ 85281',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=1605+W+University+Dr+Ste+109+Tempe+AZ+85281',
  phone: '(480) 382-2189',
  phoneHref: 'tel:+14803822189',
  email: 'info@supercru.com',
  facebook: 'https://www.facebook.com/TheSuperCru',
  twitter: 'https://twitter.com/thesupercru',
  remoteSupport: 'http://remote.supercru.com',
  customerPortal: 'https://supercru.repairshopr.com/my_profile/login',
}

export const capabilities = [
  'Wire installation',
  'Mobile app development',
  'Moving to the cloud',
  'Web development',
  'Technical support',
  'Google Workspace setup & migration',
  'Office 365 setup & migration',
  'Cloud-based phone systems',
]

export type ServiceIcon =
  | 'support'
  | 'apple'
  | 'creative'
  | 'code'
  | 'cable'
  | 'monitor'
  | 'cloud'
  | 'home'

export type Service = { id: string; title: string; body: string; icon: ServiceIcon }

export const services: Service[] = [
  {
    id: 'post-purchase-support',
    title: 'Post-Purchase Support',
    body: 'Get the most out of new devices and technology, with help long after the box is opened.',
    icon: 'support',
  },
  {
    id: 'apple-relationship',
    title: 'Close Relationship with Apple',
    body: 'Apple Consultants Network members and former Apple employees who set your devices up right the first time.',
    icon: 'apple',
  },
  {
    id: 'creative-solutions',
    title: 'Creative Technical Solutions',
    body: 'Technology designed around how you work, to streamline workflows and help your business grow.',
    icon: 'creative',
  },
  {
    id: 'web-app-development',
    title: 'Website and App Development',
    body: 'Custom websites and apps built around your client relationships and your growth.',
    icon: 'code',
  },
  {
    id: 'network-infrastructure',
    title: 'Network Infrastructure Design',
    body: 'Voice and data cabling, low-voltage wiring, wireless, dial tone coordination, and system moves.',
    icon: 'cable',
  },
  {
    id: 'network-monitoring',
    title: 'Network Monitoring and Management',
    body: 'Layer 2/3 design, routers, firewalls, intrusion prevention, and access control, all kept watch over.',
    icon: 'monitor',
  },
  {
    id: 'cloud-computing',
    title: 'Cloud Computing',
    body: 'Google Workspace, Office 365, and AWS, so your team can work from anywhere and never lose data.',
    icon: 'cloud',
  },
  {
    id: 'automated-environments',
    title: 'Automated Environments',
    body: 'Security, door locks, thermostats, and remote-view surveillance, all controlled from your iPhone.',
    icon: 'home',
  },
]

export const storySteps = [
  {
    kicker: '01 — Assess',
    title: 'We start with how you actually work.',
    body: 'Devices, accounts, network, and the workflows in between. We map what you have before recommending anything.',
  },
  {
    kicker: '02 — Build',
    title: 'Infrastructure laid out right.',
    body: 'Structured cabling, low-voltage wiring, wireless, and phone systems, designed and installed as one coherent network.',
  },
  {
    kicker: '03 — Connect',
    title: 'Move to the cloud, without the chaos.',
    body: 'Google Workspace, Office 365, AWS, and cloud phones, migrated carefully so your team can work from anywhere.',
  },
  {
    kicker: '04 — Support',
    title: 'Then we keep watch.',
    body: 'Monitoring, management, and a local team you can call, so problems get caught early and fixed fast.',
  },
]

export const pillars = [
  {
    icon: 'apple' as const,
    title: 'Apple-trained team',
    body: 'Members of the Apple Consultants Network, staffed by former Apple employees.',
  },
  {
    icon: 'pin' as const,
    title: 'Local to Tempe',
    body: 'A real office on University Drive, minutes from your business, not a distant call center.',
  },
  {
    icon: 'loop' as const,
    title: 'End-to-end support',
    body: 'From the cable in the wall to the app on your phone, one team handles all of it.',
  },
]

export const nav = {
  primary: [
    { label: 'Home', href: '#top' },
    { label: 'About Us', href: '#about' },
    { label: 'Apple', href: '#apple' },
  ],
  secondary: [
    { label: 'Helpdesk', href: '#helpdesk' },
    { label: 'Check-in', href: '#check-in' },
  ],
}
