import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

const heroFilmSrc = '/media/all-stages-hero.mp4'

export function HeroFilm() {
  const videoRef = useRef(null)
  const wantsPlayback = useRef(true)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const connection = navigator.connection
    const saveData =
      connection?.saveData ||
      /(^2g$|slow-2g)/.test(connection?.effectiveType || '')
    let inView = true
    let ready = false
    let timer
    const loadVideo = () => {
      if (!video.getAttribute('src')) {
        video.src = heroFilmSrc
      }
    }
    const sync = () => {
      if (
        ready &&
        inView &&
        !document.hidden &&
        !motion.matches &&
        !saveData &&
        wantsPlayback.current
      ) {
        loadVideo()
        video.play().catch(() => {})
      } else video.pause()
    }
    // Let the poster and fonts finish before competing with them for bandwidth.
    const start = () => {
      timer = setTimeout(() => {
        ready = true
        sync()
      }, 300)
    }
    if (document.readyState === 'complete') start()
    else window.addEventListener('load', start, { once: true })
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        sync()
      },
      { threshold: 0.05 },
    )
    observer.observe(video)
    motion.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      clearTimeout(timer)
      window.removeEventListener('load', start)
      motion.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      video.pause()
    }
  }, [])

  function togglePlayback() {
    const video = videoRef.current
    setFailed(false)
    if (!video.getAttribute('src')) {
      video.src = heroFilmSrc
    }
    if (video.error) video.load()
    wantsPlayback.current = video.paused
    if (video.paused) video.play().catch(() => {})
    else video.pause()
  }

  return (
    <>
      <div className="hero-media">
        <video
          ref={videoRef}
          poster="/media/all-stages-hero-poster.webp"
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => {
            setFailed(true)
            setPlaying(false)
          }}
        />
      </div>
      <button
        className="film-control icon-button"
        onClick={togglePlayback}
        aria-label={
          failed
            ? 'Retry background film'
            : playing
              ? 'Pause background film'
              : 'Play background film'
        }
        title={playing ? 'Pause background film' : 'Play background film'}
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
    </>
  )
}
