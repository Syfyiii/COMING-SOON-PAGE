import { useLayoutEffect, useRef } from 'react'

// Use the supplied SVG's alpha silhouette to cut a window through the black sheet.
export function HeroCutout() {
  const cutout = useRef(null)

  useLayoutEffect(() => {
    const layer = cutout.current
    const sheet = layer.parentElement
    const logo = sheet.querySelector('.hero-brand-art')
    let disposed = false

    const alignMask = () => {
      if (disposed || !logo.complete || !logo.naturalWidth) return
      const style = getComputedStyle(logo)
      const boxWidth = parseFloat(style.width)
      const boxHeight = parseFloat(style.height)
      const scale = Math.min(boxWidth / 917.44, boxHeight / 389.3)
      const width = 917.44 * scale
      const height = 389.3 * scale
      layer.style.setProperty('--cutout-width', width + 'px')
      layer.style.setProperty('--cutout-height', height + 'px')
      layer.dataset.ready = 'true'
    }

    const resize = new ResizeObserver(alignMask)
    resize.observe(sheet)
    resize.observe(logo)
    logo.addEventListener('load', alignMask)
    document.fonts.ready.then(alignMask)
    alignMask()
    return () => {
      disposed = true
      resize.disconnect()
      logo.removeEventListener('load', alignMask)
    }
  }, [])

  return <div ref={cutout} className="hero-cutout" aria-hidden="true" />
}
