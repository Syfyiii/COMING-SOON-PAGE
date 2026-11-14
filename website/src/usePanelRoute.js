import { useEffect, useState } from 'react'
import { pageForRoute, readRoute, routeHref, siteOrigin } from './routes'
import { recordConversion } from './measurement'

export const panelLinks = [
  { key: 'about', label: 'About Us', subtitle: 'Our DNA' },
  { key: 'people', label: 'Staff & Influencers', subtitle: 'In the world' },
  { key: 'work', label: 'Past Work', subtitle: 'Selected perspectives' },
  { key: 'services', label: 'Services', subtitle: 'Your next move' },
]

export function usePanelRoute(initialRoute) {
  const [panel, setPanel] = useState(initialRoute)
  useEffect(() => {
    const sync = () => {
      const route = readRoute(location)
      // Preserve old shared hash URLs while giving chapters real canonical URLs.
      if (location.hash.startsWith('#/'))
        history.replaceState(
          history.state,
          '',
          routeHref(route?.key, route?.tab),
        )
      setPanel(route)
    }
    const frame = requestAnimationFrame(sync)
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  useEffect(() => {
    const page = pageForRoute(panel)
    document.title = page.title
    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
    ]) {
      document
        .querySelector(selector)
        ?.setAttribute('content', page.description)
    }
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute('content', page.title)
    document
      .querySelector('meta[property="og:url"]')
      ?.setAttribute('content', siteOrigin + page.path)
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', siteOrigin + page.path)
  }, [panel])

  function openPanel(key, tab) {
    const route = pageForRoute({
      key,
      tab: tab === 'projects' ? undefined : tab,
    }).route
    const path = routeHref(route?.key, route?.tab)
    if (key === 'services')
      recordConversion('service_selected', route.tab || 'projects')
    if (location.pathname + location.hash !== path) {
      // One history entry per open chapter; switching chapters preserves the home return point.
      const alreadyOpen = Boolean(readRoute(location))
      const state = alreadyOpen
        ? history.state
        : {
            ...history.state,
            dnaPanel: true,
            dnaReturnUrl: location.pathname + location.search + location.hash,
          }
      history[alreadyOpen ? 'replaceState' : 'pushState'](state, '', path)
    }
    setPanel(route)
  }

  function closePanel() {
    if (history.state?.dnaPanel) history.back()
    else {
      history.replaceState(null, '', '/')
      setPanel(null)
    }
  }

  return { panel, openPanel, closePanel }
}
