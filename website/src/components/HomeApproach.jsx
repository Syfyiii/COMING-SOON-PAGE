import { ArrowDown, ArrowRight } from 'lucide-react'
import { Brand } from './Brand'

export function HomeApproach() {
  return (
    <>
      <section
        className="approach-section section-pad"
        id="approach"
        aria-labelledby="approach-title"
        data-nav-tone="dark"
      >
        <div className="chapter-top">
          <p className="eyebrow">
            <span>/ 02</span> Our DNA
          </p>
          <span className="eyebrow">Different is in our nature.</span>
        </div>
        <div className="approach-grid">
          <h2 id="approach-title">
            <span className="text-mask">
              <span data-line>Culture first.</span>
            </span>
            <span className="text-mask">
              <span data-line>Business</span>
            </span>
            <span className="text-mask">
              <span data-line>forward.</span>
            </span>
          </h2>
          <div className="approach-copy">
            <Brand variant="black" mark className="approach-mark" />
            <p>
              We connect corporations to the people, communities and culture
              that give their brands meaning.
            </p>
            <p>
              Through experiential, digital and influencer marketing, we turn
              that connection into shared experiences, relevant campaigns and
              lasting relationships.
            </p>
            <a href="#services" className="text-link">
              See what we can move <ArrowDown size={18} />
            </a>
          </div>
        </div>
        <div className="approach-bottom">
          <span>Cultural insight</span>
          <ArrowRight aria-hidden="true" />
          <span>Creative action</span>
          <ArrowRight aria-hidden="true" />
          <span>Measurable growth</span>
        </div>
      </section>

      <div
        className="manifesto-strip"
        role="img"
        aria-label="Built different. Built for what's next."
      >
        <div className="manifesto-track" aria-hidden="true">
          <span>Built different.</span>
          <span className="manifesto-slash">/</span>
          <span>Built for what's next.</span>
        </div>
      </div>
    </>
  )
}
