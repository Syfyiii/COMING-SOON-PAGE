export const siteOrigin = 'https://www.digitalnativesagcy.com'

export const pages = [
  {
    path: '/',
    route: null,
    title: 'DNA | Experiential, Digital & Influencer Marketing',
    description:
      'Digital Natives Agency connects corporations to culture through experiential marketing, digital campaigns and creator partnerships.',
  },
  {
    path: '/about/',
    route: { key: 'about' },
    title: 'Our DNA | Digital Natives Agency',
    description:
      'Cultural insight, creative action and business focus. Meet the approach behind Digital Natives Agency.',
  },
  {
    path: '/people/',
    route: { key: 'people' },
    title: 'Staff & Influencers | Digital Natives Agency',
    description:
      'Strategy, production and creator partnerships working together to connect your brand with the people who matter.',
  },
  {
    path: '/work/',
    route: { key: 'work' },
    title: 'Our Work | Digital Natives Agency',
    description:
      'Explore DNA production and brand experiences, with work organized across production, media and marketing, consulting and influencers.',
  },
  {
    path: '/services/',
    route: { key: 'services' },
    title: 'Marketing Services & Pricing | Digital Natives Agency',
    description:
      'Explore DNA websites, apps, experiential campaigns, digital marketing and influencer services. Find the right scope for your next move.',
  },
  {
    path: '/services/ai-call-center/',
    route: { key: 'services', tab: 'ai' },
    title: 'AI Call Center & Integrations | Digital Natives Agency',
    description:
      'Keep conversations moving with DNA AI call handling, booking workflows and customer follow-up integrations. Discuss your call center needs.',
  },
  {
    path: '/services/growth-packages/',
    route: { key: 'services', tab: 'plans' },
    title: 'Marketing Growth Packages | Digital Natives Agency',
    description:
      'Compare DNA Launch, Presence, Momentum, Authority and Icon marketing packages, with clear monthly pricing and setup scope.',
  },
  {
    path: '/privacy.html',
    route: { key: 'privacy' },
    title: 'Privacy Policy | DNA',
    description: 'Privacy Policy for DNAgency LLC.',
  },
  {
    path: '/terms.html',
    route: { key: 'terms' },
    title: 'Terms & Conditions | DNA',
    description: 'Terms and conditions for DNAgency LLC.',
  },
  {
    path: '/opt-in-evidence.html',
    route: { key: 'sms' },
    title: 'SMS Consent Documentation | DNA',
    description: 'SMS opt-in consent documentation for DNAgency LLC.',
  },
]

export function pageForRoute(route) {
  return (
    pages.find(
      (page) =>
        page.route?.key === route?.key && page.route?.tab === route?.tab,
    ) ||
    pages.find((page) => page.route?.key === route?.key && !page.route?.tab) ||
    pages[0]
  )
}

export function routeHref(key, tab) {
  return pageForRoute(
    key ? { key, tab: tab === 'projects' ? undefined : tab } : null,
  ).path
}

export function readRoute(location) {
  if (!location) return null
  if (location.hash.startsWith('#/')) {
    const [key, tab] = location.hash.slice(2).split('/')
    return pages.some((page) => page.route?.key === key)
      ? pageForRoute({ key, tab: tab === 'projects' ? undefined : tab }).route
      : null
  }
  const pathname = location.pathname.replace(/\/index\.html$/, '/')
  return (
    pages.find((page) => page.path === pathname || page.path === pathname + '/')
      ?.route || null
  )
}
