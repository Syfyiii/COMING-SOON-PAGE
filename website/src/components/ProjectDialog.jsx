import { X } from 'lucide-react'
import { InquiryForm } from './InquiryForm'

export function ProjectDialog({ dialogRef, interest }) {
  return (
    <dialog
      ref={dialogRef}
      className="project-dialog"
      aria-labelledby="project-title"
      data-lenis-prevent
    >
      <div className="dialog-top">
        <p className="eyebrow">DNA / New business</p>
        <button
          className="icon-button"
          onClick={() => dialogRef.current.close()}
          aria-label="Close project brief"
          title="Close project brief"
        >
          <X />
        </button>
      </div>
      <h2 id="project-title">What's your next move?</h2>
      <p className="dialog-lead">
        Tell us where you are. Let's talk about where you could go.
      </p>
      <InquiryForm key={interest} interest={interest} />
    </dialog>
  )
}
