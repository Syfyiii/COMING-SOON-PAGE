import { ArrowUpRight } from 'lucide-react'
import { Brand } from './Brand'
import { contact } from '../contact'

export function HomeFooter({ startProject, openPanel }) {
  return (
    <>
      <footer
        className="site-footer section-pad"
        id="contact"
        data-nav-tone="light"
      >
        <div className="footer-top">
          <span className="eyebrow">/ Your next chapter starts here.</span>
          <span className="footer-agency">
            Experiential / Digital / Influencer Marketing
          </span>
        </div>
        <a href="#top" className="footer-wordmark" aria-label="DNA back to top">
          <Brand />
          <span>Digital Natives Agency</span>
        </a>
        <button className="footer-cta" onClick={() => startProject()}>
          <span>
            Let's make
            <br />
            some moves.
          </span>
          <span className="footer-cta-arrow">
            <ArrowUpRight strokeWidth={1} />
          </span>
        </button>
        <div className="footer-meta">
          <p>
            Bring the ambition.
            <br />
            We'll bring the DNA.
          </p>
          <button className="text-link" onClick={() => openPanel('work')}>
            Explore the work <ArrowUpRight size={15} />
          </button>
          <a href="#top">
            Back to top <ArrowUpRight size={15} />
          </a>
        </div>
        <nav className="footer-policies" aria-label="Policies">
          <a
            href="/privacy.html"
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey
              ) {
                event.preventDefault()
                openPanel('privacy')
              }
            }}
          >
            Privacy Policy
          </a>
          <a
            href="/terms.html"
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey
              ) {
                event.preventDefault()
                openPanel('terms')
              }
            }}
          >
            Terms & Conditions
          </a>
          <a
            href="/opt-in-evidence.html"
            onClick={(event) => {
              if (
                !event.ctrlKey &&
                !event.metaKey &&
                !event.shiftKey &&
                !event.altKey
              ) {
                event.preventDefault()
                openPanel('sms')
              }
            }}
          >
            SMS Consent
          </a>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </nav>
        <div className="footer-bottom">
          <span>Independent by nature. Connected by culture.</span>
          <span className="copyright">
            &copy; {new Date().getFullYear()} Digital Natives Agency
          </span>
        </div>
      </footer>
    </>
  )
}
