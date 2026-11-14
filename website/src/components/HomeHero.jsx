import { ArrowDown } from 'lucide-react'
import { HeroFilm } from './HeroFilm'
import { HeroCutout } from './HeroCutout'
import { Brand } from './Brand'

export function HomeHero({ primary = true }) {
  const Heading = primary ? 'h1' : 'p'
  return (
    <>
      <section
        className="hero-scene"
        aria-labelledby="hero-title"
        data-nav-tone="light"
      >
        <div className="hero-scroll-track">
          <div className="hero">
            <HeroFilm />
            <div className="hero-sheet">
              <HeroCutout />
              <div className="hero-topline">
                <p>
                  Connecting corporations
                  <br />
                  to culture.
                </p>
                <p className="hero-coordinate">
                  Experiential / Digital / Influencer
                </p>
              </div>
              <Heading id="hero-title" className="sr-only">
                DNA — Digital Natives Agency
              </Heading>
              <div className="hero-brand" aria-hidden="true">
                <Brand className="hero-brand-art" />
                <span className="hero-brand-full">Digital Natives Agency</span>
              </div>
              <div className="hero-bottom">
                <p>Experiences. Campaigns. Creator partnerships.</p>
                <a className="text-link hero-explore" href="#work">
                  Discover our world <ArrowDown size={19} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
