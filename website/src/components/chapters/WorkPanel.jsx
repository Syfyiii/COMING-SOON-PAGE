import { ArrowUpRight } from 'lucide-react'
import { PanelTabs } from '../PanelTabs'
import { ChapterIntro } from './ChapterIntro'
import { ChapterCTA } from './ChapterCTA'

const workCategories = [
  { key: 'production', label: 'Production' },
  { key: 'media', label: 'Media & Marketing' },
  { key: 'consulting', label: 'Consulting' },
  { key: 'influencers', label: 'Influencers' },
]

export function WorkPanel({ stories, onStory, onSelect }) {
  return (
    <>
      <ChapterIntro
        eyebrow="Past work / Selected perspectives"
        title="See the connection."
        copy="A closer look at the experiences, content and people in our world."
      />
      <div className="chapter-section work-browser">
        <PanelTabs label="Work categories" items={workCategories}>
          {(category) =>
            category.key === 'production' || category.key === 'media' ? (
              <div className="portfolio-grid">
                {stories.map((story, index) => {
                  const caption = story.captions[category.key]
                  const photo =
                    category.key === 'production'
                      ? story.images.at(-1)
                      : story.images[0]
                  return (
                    <button
                      className="portfolio-project"
                      key={story.id}
                      onClick={() => onStory(story)}
                      aria-label={`View ${category.label.toLowerCase()}: ${story.title}`}
                    >
                      <div className="portfolio-photo">
                        <img
                          src={photo.src}
                          alt={photo.alt}
                          width={1400}
                          height={900}
                          loading="lazy"
                        />
                        <span className="portfolio-open">
                          <ArrowUpRight size={24} />
                        </span>
                      </div>
                      <div className="portfolio-caption">
                        <span className="eyebrow">
                          0{index + 1} / {category.label}
                        </span>
                        <h2>{caption.title}</h2>
                        <p>{caption.copy}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="portfolio-note">
                <p className="eyebrow">{category.label} / Selected work</p>
                <h2>
                  {category.key === 'consulting'
                    ? 'Direction comes first.'
                    : 'Connection over follower count.'}
                </h2>
                <p>
                  {category.key === 'consulting'
                    ? 'No published case studies in this category yet. Talk with us about brand positioning, campaign strategy and your next stage of growth.'
                    : 'No published case studies in this category yet. Talk with us about the audience, the story and the right partnership for your brand.'}
                </p>
                <button
                  className="text-link"
                  onClick={() => onSelect(category.label)}
                >
                  {category.key === 'consulting'
                    ? 'Discuss a strategy brief'
                    : 'Discuss a creator brief'}{' '}
                  <ArrowUpRight size={18} />
                </button>
              </div>
            )
          }
        </PanelTabs>
      </div>
      <ChapterCTA
        title="What could we build together?"
        label="Start the conversation"
        onClick={() => onSelect('Production, media or marketing project')}
      />
    </>
  )
}
