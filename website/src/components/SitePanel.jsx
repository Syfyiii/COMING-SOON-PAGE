import { useEffect, useRef } from 'react'
import { ArrowUpRight, ArrowRight, X } from 'lucide-react'
import { Brand } from './Brand'
import { AboutPanel } from './chapters/AboutPanel'
import { PeoplePanel } from './chapters/PeoplePanel'
import { WorkPanel } from './chapters/WorkPanel'
import { ServicesPanel } from './chapters/ServicesPanel'
import { LegalContent } from './LegalContent'
import { panelLinks } from '../usePanelRoute'
import { contact } from '../contact'
import { routeHref } from '../routes'

export function SitePanel({
  route,
  onClose,
  onNavigate,
  onSelect,
  stories,
  onStory,
}) {
  const dialog = useRef(null)
  const scroll = useRef(null)
  const returnFocus = useRef(null)
  useEffect(() => {
    const element = dialog.current
    if (!returnFocus.current) returnFocus.current = document.activeElement
    if (element.open) element.close()
    element.showModal()
    return () => {
      element.close()
      // History traversal can reset focus after popstate; restore it on the next frame.
      requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return
        const previousFocus = returnFocus.current
        const fallback = document.querySelector('.site-header .nav-brand')
        const target =
          previousFocus?.isConnected && previousFocus.getClientRects().length
            ? previousFocus
            : fallback
        target?.focus({ preventScroll: true })
      })
    }
  }, [])
  useEffect(() => {
    scroll.current.scrollTo({ top: 0, behavior: 'instant' })
    const heading = scroll.current.querySelector('#chapter-title')
    if (heading) {
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    }
  }, [route.key])
  const isLegal = ['privacy', 'terms', 'sms'].includes(route.key)
  return (
    <dialog
      open
      ref={dialog}
      className={`chapter-dialog ${isLegal ? 'chapter-legal' : ''}`}
      aria-labelledby="chapter-title"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="chapter-toolbar">
        <span className="chapter-brand">
          <Brand variant="black" mark />
          <span>Digital Natives Agency</span>
        </span>
        <span className="chapter-location">
          {isLegal
            ? 'Information & policies'
            : panelLinks.find((link) => link.key === route.key)?.label}
        </span>
        <button
          className="icon-button"
          aria-label="Close chapter"
          title="Close chapter"
          onClick={onClose}
        >
          <X />
        </button>
        <noscript>
          <a href="/">Back to home</a>
        </noscript>
      </header>
      <nav className="chapter-navigation" aria-label="Chapter navigation">
        {panelLinks.map((link) => (
          <a
            key={link.key}
            href={routeHref(link.key)}
            aria-current={route.key === link.key ? 'page' : undefined}
            onClick={(event) => {
              if (
                event.button ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return
              event.preventDefault()
              onNavigate(link.key)
            }}
          >
            {link.label}
            <ArrowRight size={14} aria-hidden="true" />
          </a>
        ))}
      </nav>
      <div className="chapter-scroll" ref={scroll} data-lenis-prevent>
        <div className="chapter-content" key={route.key}>
          {route.key === 'about' && <AboutPanel onSelect={onSelect} />}
          {route.key === 'people' && <PeoplePanel onSelect={onSelect} />}
          {route.key === 'work' && (
            <WorkPanel
              stories={stories}
              onStory={onStory}
              onSelect={onSelect}
            />
          )}
          {route.key === 'services' && (
            <ServicesPanel
              tab={route.tab}
              onSelect={onSelect}
              onNavigate={onNavigate}
            />
          )}
          {isLegal && <LegalContent type={route.key} onNavigate={onNavigate} />}
          <footer className="chapter-footer">
            <span>DNAgency LLC</span>
            <a href={`mailto:${contact.email}`}>
              {contact.email} <ArrowUpRight size={15} />
            </a>
            <a href={contact.phoneHref}>{contact.phone}</a>
          </footer>
        </div>
      </div>
    </dialog>
  )
}
