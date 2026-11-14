import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import gsap from 'gsap'
import { Brand } from './Brand'
import { panelLinks } from '../usePanelRoute'
import { routeHref } from '../routes'

const links = panelLinks.map((link) => ({
  ...link,
  href: routeHref(link.key),
}))

export function Navigation({ onStartProject, onOpenPanel, activePanel }) {
  const dialog = useRef(null)
  const trigger = useRef(null)
  const timeline = useRef(null)
  const previousFocus = useRef(null)
  const closing = useRef(false)
  const afterClose = useRef(null)
  const finishRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(null)
  const [tone, setTone] = useState('light')
  const active = links.findIndex((link) => link.key === activePanel)
  const selected = hovered ?? active

  function finishClose() {
    timeline.current?.kill()
    dialog.current.close()
    closing.current = false
    setOpen(false)
    if (previousFocus.current?.getClientRects().length) {
      previousFocus.current.focus({ preventScroll: true })
    }
    const next = afterClose.current
    afterClose.current = null
    next?.()
  }

  function openMenu() {
    if (dialog.current.open) return
    previousFocus.current = document.activeElement
    closing.current = false
    afterClose.current = null
    dialog.current.showModal()
    setOpen(true)
    const outer = dialog.current.querySelector('.menu-sheet')
    const inner = dialog.current.querySelector('.menu-sheet-inner')
    timeline.current?.kill()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set([outer, inner], { clearProps: 'transform' })
      return
    }
    timeline.current = gsap
      .timeline()
      .fromTo(
        outer,
        { xPercent: 20, yPercent: -110, rotation: 8 },
        {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          duration: 0.8,
          ease: 'power4.out',
        },
        0,
      )
      .fromTo(
        inner,
        { xPercent: 30, yPercent: -80, rotation: 14 },
        {
          xPercent: 0,
          yPercent: 0,
          rotation: 0,
          duration: 0.8,
          ease: 'power4.out',
        },
        0.1,
      )
  }

  function closeMenu(next) {
    if (closing.current) return
    afterClose.current = typeof next === 'function' ? next : null
    finishRef.current = finishClose
    closing.current = true
    timeline.current?.kill()
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finishClose()
      return
    }
    timeline.current = gsap
      .timeline({ onComplete: finishClose })
      .to(
        dialog.current.querySelector('.menu-sheet-inner'),
        {
          xPercent: 30,
          yPercent: -80,
          rotation: 14,
          duration: 0.6,
          ease: 'power3.inOut',
        },
        0,
      )
      .to(
        dialog.current.querySelector('.menu-sheet'),
        {
          xPercent: 20,
          yPercent: -110,
          rotation: 8,
          duration: 0.6,
          ease: 'power3.inOut',
        },
        0.08,
      )
  }

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const surface = document
        .elementsFromPoint(innerWidth / 2, 80)
        .map((element) => element.closest('[data-nav-tone]'))
        .find(Boolean)
      setTone(surface?.dataset.navTone || 'light')
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const settle = () => {
      if (!dialog.current.open) return
      if (closing.current) finishRef.current?.()
      else timeline.current?.progress(1).kill()
    }
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', settle)
    update()
    return () => {
      cancelAnimationFrame(frame)
      timeline.current?.kill()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      motion.removeEventListener('change', settle)
    }
  }, [])

  return (
    <>
      <header className="site-header" data-tone={tone}>
        <a href="#top" className="nav-brand" aria-label="DNA home">
          <Brand mark variant={tone === 'dark' ? 'black' : 'white'} />
        </a>
        <span className="header-signature">
          Independent by nature.
          <br />
          Connected by culture.
        </span>
        <nav
          className="desktop-nav"
          aria-label="Main navigation"
          onMouseLeave={() => setHovered(null)}
        >
          <div
            className="desktop-nav-list"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                setHovered(null)
            }}
          >
            {links.map((link, index) => (
              <div
                className="desktop-nav-item"
                key={link.href}
                style={{
                  '--nav-shift':
                    selected >= 0 && index >= selected ? '16px' : '0px',
                }}
              >
                <a
                  href={link.href}
                  aria-current={active === index ? 'location' : undefined}
                  data-selected={selected === index}
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
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
                    onOpenPanel(link.key)
                  }}
                >
                  <i className="nav-dot" aria-hidden="true" />
                  <span>{link.label}</span>
                </a>
                {index < links.length - 1 && (
                  <i className="nav-divider" aria-hidden="true">
                    /
                  </i>
                )}
              </div>
            ))}
          </div>
        </nav>
        <button
          className="text-link header-contact"
          onClick={() => onStartProject()}
        >
          Let's talk <ArrowUpRight size={17} />
        </button>
        <button
          ref={trigger}
          className="menu-toggle mobile-menu"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="navigation-dialog"
          onClick={openMenu}
        >
          <span />
          <span />
        </button>
      </header>

      <dialog
        ref={dialog}
        id="navigation-dialog"
        className="menu-dialog"
        aria-label="Navigation"
        data-lenis-prevent
        onCancel={(event) => {
          event.preventDefault()
          closeMenu()
        }}
      >
        <div className="menu-sheet">
          <div className="menu-sheet-inner">
            <img
              className="menu-photograph"
              src="/media/culture-crowd.webp"
              alt=""
              aria-hidden="true"
            />
            <div className="menu-content">
              <p className="eyebrow">Digital Natives Agency / Explore</p>
              <nav aria-label="Mobile navigation">
                {links.map((link, index) => (
                  <a
                    href={link.href}
                    key={link.href}
                    aria-current={active === index ? 'location' : undefined}
                    onClick={(event) => {
                      event.preventDefault()
                      closeMenu(() => onOpenPanel(link.key))
                    }}
                  >
                    <i className="menu-active-dot" aria-hidden="true" />
                    <span>
                      {link.label}
                      <small>{link.subtitle}</small>
                    </span>
                  </a>
                ))}
              </nav>
              <div className="menu-bottom">
                <p className="eyebrow">/ Your next chapter</p>
                <button
                  className="menu-contact"
                  onClick={() => closeMenu(() => onStartProject())}
                >
                  Let's talk <ArrowUpRight />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="menu-top">
          <span className="nav-brand" role="img" aria-label="DNA">
            <Brand mark />
          </span>
          <button
            className="menu-toggle menu-close"
            aria-label="Close navigation"
            onClick={() => closeMenu()}
            autoFocus
          >
            <span />
            <span />
          </button>
        </div>
      </dialog>
    </>
  )
}
