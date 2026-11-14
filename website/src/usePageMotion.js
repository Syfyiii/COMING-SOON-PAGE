import { useCallback, useEffect, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import 'lenis/dist/lenis.css'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export function usePageMotion(scope) {
  const scroller = useRef(null)

  const navigateTo = useCallback(
    (hash, { immediate = false, focus = false } = {}) => {
      const target = document.getElementById(hash.slice(1))
      if (!target) return
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
      if (location.hash !== hash) history.pushState(null, '', hash)
      const complete = () => {
        if (focus) {
          target.tabIndex = -1
          target.focus({ preventScroll: true })
        }
      }
      if (scroller.current) {
        if (!document.querySelector('dialog[open]')) scroller.current.start()
        scroller.current.scrollTo(target, {
          offset: hash === '#top' ? 0 : -82,
          duration: 1.1,
          immediate: immediate || reduce,
          onComplete: complete,
        })
      } else {
        target.scrollIntoView({
          block: 'start',
          behavior: immediate || reduce ? 'instant' : 'smooth',
        })
        complete()
      }
    },
    [],
  )

  useEffect(() => {
    const root = scope.current
    const followAnchor = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor = event.target.closest('a[href^="#"]')
      if (!anchor || anchor.closest('dialog')) return
      const hash = anchor.getAttribute('href')
      if (!document.getElementById(hash.slice(1))) return
      event.preventDefault()
      navigateTo(hash, { focus: anchor.classList.contains('skip-link') })
    }
    root.addEventListener('click', followAnchor)
    return () => root.removeEventListener('click', followAnchor)
  }, [scope, navigateTo])

  useGSAP(
    () => {
      const root = scope.current
      const media = gsap.matchMedia()
      let disposed = false
      let refreshFrame = 0

      document.fonts.ready.then(() => {
        if (disposed) return

        media.add(
          '(prefers-reduced-motion: no-preference) and (pointer: fine)',
          () => {
            const lenis = new Lenis({
              lerp: 0.085,
              smoothWheel: true,
              syncTouch: false,
              anchors: false,
              prevent: (node) => node.tagName === 'DIALOG',
            })
            scroller.current = lenis
            const tick = (time) => lenis.raf(time * 1000)
            const syncModal = () => {
              if (document.querySelector('dialog[open]')) lenis.stop()
              else lenis.start()
            }
            const modalObserver = new MutationObserver(syncModal)
            modalObserver.observe(root, {
              subtree: true,
              attributes: true,
              childList: true,
              attributeFilter: ['open'],
            })
            lenis.on('scroll', ScrollTrigger.update)
            gsap.ticker.add(tick)
            syncModal()
            return () => {
              modalObserver.disconnect()
              gsap.ticker.remove(tick)
              lenis.off('scroll', ScrollTrigger.update)
              lenis.destroy()
              scroller.current = null
            }
          },
          root,
        )

        media.add(
          '(prefers-reduced-motion: no-preference) and (min-height: 621px)',
          () => {
            root.classList.add('has-scroll-scenes')
            gsap.to('.hero-sheet', {
              xPercent: -18,
              yPercent: -112,
              rotation: -12,
              ease: 'none',
              scrollTrigger: {
                trigger: '.hero-scene',
                start: 'top top',
                end: () => '+=' + innerHeight * 1.05,
                scrub: 0.5,
                invalidateOnRefresh: true,
              },
            })

            const items = [...root.querySelectorAll('.work-item')]
            const markers = [...root.querySelectorAll('.work-marker')]
            items.forEach((item, index) => {
              const sheet = item.querySelector('.work-sheet')
              const next = markers[index + 1]
              const timeline = gsap.timeline({
                scrollTrigger: {
                  trigger: markers[index],
                  start: 'top bottom',
                  endTrigger: next || markers[index],
                  end: 'top 64px',
                  scrub: 0.5,
                  invalidateOnRefresh: true,
                },
              })
              timeline.fromTo(
                sheet,
                { xPercent: 20, yPercent: 35, rotation: 12 },
                {
                  xPercent: 0,
                  yPercent: 0,
                  rotation: 0,
                  duration: 0.94,
                  ease: 'power1.out',
                },
              )
              if (next) {
                timeline.to({}, { duration: 0.7 })
                timeline.to(sheet, {
                  xPercent: -22,
                  yPercent: -28,
                  rotation: -8,
                  duration: 0.69,
                  ease: 'none',
                })
              }
              gsap.fromTo(
                item.querySelector('.work-image img'),
                {
                  scale: 1.18,
                  yPercent: 10,
                  rotation: 3,
                },
                {
                  scale: 1,
                  yPercent: 0,
                  rotation: 0,
                  ease: 'power1.out',
                  scrollTrigger: {
                    trigger: markers[index],
                    start: 'top bottom',
                    end: 'top 64px',
                    scrub: 0.65,
                    invalidateOnRefresh: true,
                  },
                },
              )
            })

            const focusScene = (event) => {
              const item = event.target.closest('.work-item')
              const hero = event.target.closest('.hero')
              if ((!item && !hero) || !event.target.matches(':focus-visible'))
                return
              const marker = item && markers[items.indexOf(item)]
              const destination = marker
                ? marker.getBoundingClientRect().top + window.scrollY - 64
                : 0
              if (scroller.current)
                scroller.current.scrollTo(destination, { immediate: true })
              else window.scrollTo({ top: destination, behavior: 'instant' })
              ScrollTrigger.update()
              // Keyboard focus must reveal a settled, usable scene immediately.
              ScrollTrigger.getAll().forEach((trigger) => {
                const tween = trigger.getTween()
                if (typeof tween?.progress === 'function') tween.progress(1)
              })
            }
            root.addEventListener('focusin', focusScene)
            return () => {
              root.classList.remove('has-scroll-scenes')
              root.removeEventListener('focusin', focusScene)
            }
          },
          root,
        )

        media.add(
          '(prefers-reduced-motion: no-preference)',
          () => {
            root.querySelectorAll('[data-reveal]').forEach((element) => {
              if (element.getBoundingClientRect().bottom < 0) return
              gsap.from(element, {
                y: 35,
                opacity: 0,
                duration: 0.9,
                ease: 'power3.out',
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 94%',
                  once: true,
                },
              })
            })
            gsap.from('[data-line]', {
              yPercent: 110,
              duration: 1.05,
              stagger: 0.12,
              ease: 'power4.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: '#approach-title',
                start: 'top 90%',
                once: true,
              },
            })
            root.querySelectorAll('[data-mask]').forEach((element) => {
              if (element.getBoundingClientRect().bottom < 0) return
              gsap.from(element, {
                clipPath: 'inset(12% 0 12% 0)',
                duration: 1.25,
                ease: 'power3.out',
                clearProps: 'clipPath',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 94%',
                  once: true,
                },
              })
            })
            gsap.to('.manifesto-track', {
              x: () =>
                -Math.max(
                  0,
                  root.querySelector('.manifesto-track').scrollWidth -
                    root.querySelector('.manifesto-strip').clientWidth,
                ),
              ease: 'none',
              scrollTrigger: {
                trigger: '.manifesto-strip',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            })
          },
          root,
        )

        ScrollTrigger.refresh()
        const hash = location.hash
        if (
          hash &&
          window.scrollY < 80 &&
          document.getElementById(hash.slice(1))
        ) {
          navigateTo(hash, { immediate: true })
        }
      })

      const resize = new ResizeObserver(() => {
        cancelAnimationFrame(refreshFrame)
        refreshFrame = requestAnimationFrame(() => {
          if (!disposed) {
            scroller.current?.resize()
            ScrollTrigger.refresh()
          }
        })
      })
      resize.observe(root.querySelector('main'))
      return () => {
        disposed = true
        cancelAnimationFrame(refreshFrame)
        resize.disconnect()
        media.revert()
      }
    },
    { scope },
  )

  return { navigateTo }
}
