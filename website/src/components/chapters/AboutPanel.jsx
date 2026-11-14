import { ChapterIntro } from './ChapterIntro'
import { ChapterCTA } from './ChapterCTA'

export function AboutPanel({ onSelect }) {
  return (
    <>
      <ChapterIntro
        eyebrow="About us / Our DNA"
        title="Culture is our starting point."
        copy="We connect corporations to culture through experiential, digital and influencer marketing. Every experience, campaign and partnership starts with the people your brand wants to reach."
      />
      <figure className="chapter-photo about-photo">
        <img
          src="/media/aerial-culture.webp"
          alt="A neighborhood gathering seen from above"
          width={1600}
          height={900}
        />
        <figcaption>Close to the culture. Clear on the objective.</figcaption>
      </figure>
      <section className="chapter-section about-belief">
        <p className="eyebrow">What we believe</p>
        <h2>
          Relevance earns attention.
          <br />
          Connection gives it somewhere to go.
        </h2>
        <p>
          Digital Natives Agency helps corporations build relationships with the
          communities they serve. We listen to what people care about,
          understand where your brand belongs, and bring that connection to life
          through experiences, digital campaigns and creator partnerships.
        </p>
      </section>
      <section className="chapter-section chapter-dark">
        <p className="eyebrow">How we move</p>
        <div className="principle-list">
          {[
            [
              'Listen closely.',
              'Understand the audience, the context and the opportunity before choosing the channel.',
            ],
            [
              'Build with intent.',
              'Give every campaign, experience and partnership a job to do.',
            ],
            [
              'Learn. Refine. Repeat.',
              'Track the signals that matter, then use them to make the next move stronger.',
            ],
          ].map(([title, copy], index) => (
            <div key={title}>
              <span>0{index + 1}</span>
              <h2>{title}</h2>
              <p>{copy}</p>
            </div>
          ))}
        </div>
      </section>
      <ChapterCTA
        title="Ambition, meet direction."
        label="Bring us your next challenge"
        onClick={() => onSelect('Brand strategy & growth')}
      />
    </>
  )
}
