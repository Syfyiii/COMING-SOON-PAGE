import { Fragment } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { stories } from '../stories'

export function HomeWork({ onStory, onExplore }) {
  return (
    <>
      <section
        className="work-section section-pad"
        id="work"
        aria-labelledby="work-title"
        data-nav-tone="light"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span>/ 01</span> Out in the world
            </p>
            <h2 id="work-title" data-reveal>
              Real connections.
            </h2>
          </div>
          <p className="section-aside">
            On the street. In the room. Across the feed.
            <br />
            This is where brands become part of culture.
          </p>
        </div>
        <div className="work-grid">
          {stories.map((story, index) => (
            <Fragment key={story.id}>
              <div className="work-marker" aria-hidden="true" />
              <article className="work-item" style={{ '--story-index': index }}>
                <div className="work-sheet">
                  <div className="work-caption" data-nav-tone="dark">
                    <span className="work-index">0{index + 1} / 02</span>
                    <h3>{story.title}</h3>
                    <span className="eyebrow">{story.label}</span>
                    <span className="photo-count">
                      {story.images.length} photographs
                    </span>
                  </div>
                  <button
                    className="work-visual"
                    onClick={() => onStory(story)}
                    aria-label={`View photos: ${story.title}`}
                  >
                    <span className="work-image">
                      <img
                        src={story.images[0].src}
                        alt={story.images[0].alt}
                        width={1600}
                        height={1069}
                        loading="lazy"
                      />
                    </span>
                    <span className="work-overlay">
                      <span className="eyebrow">{story.place}</span>
                      <span className="work-statement">{story.short}</span>
                    </span>
                    <span className="work-open">
                      <span>Explore story</span>
                      <ArrowUpRight size={22} />
                    </span>
                  </button>
                </div>
              </article>
              {index < stories.length - 1 && (
                <div className="work-gap" aria-hidden="true" />
              )}
            </Fragment>
          ))}
          <div className="work-tail" aria-hidden="true" />
        </div>
        <div className="work-end">
          <p>Real people. Lasting connections.</p>
          <button className="text-link" onClick={() => onExplore()}>
            Explore past work <ArrowUpRight size={18} />
          </button>
        </div>
      </section>
    </>
  )
}
