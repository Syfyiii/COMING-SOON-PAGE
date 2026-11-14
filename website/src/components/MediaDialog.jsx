import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'

export function MediaDialog({ story, onClose }) {
  const dialog = useRef(null)
  const [index, setIndex] = useState(0)
  const photo = story.images[index]
  useEffect(() => {
    const element = dialog.current
    const previousFocus = document.activeElement
    element.showModal()
    return () => {
      element.close()
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])

  function move(direction) {
    setIndex(
      (current) =>
        (current + direction + story.images.length) % story.images.length,
    )
  }

  return (
    <dialog
      ref={dialog}
      className="media-dialog"
      aria-labelledby="gallery-title"
      data-lenis-prevent
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          move(1)
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          move(-1)
        }
      }}
    >
      <div className="dialog-top">
        <h2 id="gallery-title">{story.title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close gallery"
          title="Close gallery"
        >
          <X />
        </button>
      </div>
      <div className="gallery-photo">
        <img key={photo.src} src={photo.src} alt={photo.alt} />
      </div>
      <div className="gallery-bottom">
        <p aria-live="polite">
          {index + 1} / {story.images.length}
          <span>{photo.alt}</span>
        </p>
        <div>
          <button
            className="icon-button"
            aria-label="Previous photo"
            title="Previous photo"
            onClick={() => move(-1)}
          >
            <ArrowLeft />
          </button>
          <button
            className="icon-button"
            aria-label="Next photo"
            title="Next photo"
            onClick={() => move(1)}
          >
            <ArrowRight />
          </button>
        </div>
      </div>
    </dialog>
  )
}
