import { ArrowUpRight } from 'lucide-react'
import { ChapterIntro } from './ChapterIntro'
import { ChapterCTA } from './ChapterCTA'

export function PeoplePanel({ onSelect }) {
  return (
    <>
      <ChapterIntro
        eyebrow="Staff & Influencers / In the world"
        title="Different perspectives. Shared ambition."
        copy="The people behind the thinking. The creators inside the culture. The right mix for your next move."
      />
      <figure className="chapter-photo people-photo">
        <img
          src="/media/street-connection.webp"
          alt="Guests in conversation at a community event"
          width={1400}
          height={788}
        />
        <figcaption>Connection starts with people.</figcaption>
      </figure>
      <section className="chapter-section">
        <p className="eyebrow">Staff / The disciplines behind DNA</p>
        <h2>One connected team.</h2>
        <div className="editorial-columns">
          <div>
            <span className="eyebrow">01 / Direction</span>
            <h3>Strategy & partnerships</h3>
            <p>
              Audience insight, brand positioning and the relationships that
              keep the work focused.
            </p>
          </div>
          <div>
            <span className="eyebrow">02 / Expression</span>
            <h3>Creative & production</h3>
            <p>
              Ideas, content and real-world experiences that give your brand a
              distinct presence.
            </p>
          </div>
          <div>
            <span className="eyebrow">03 / Momentum</span>
            <h3>Digital & growth</h3>
            <p>
              Web experiences, media and connected systems that help turn
              interest into action.
            </p>
          </div>
        </div>
        <button
          className="text-link"
          onClick={() => onSelect('Meet the DNA project team')}
        >
          Meet your project team <ArrowUpRight size={18} />
        </button>
      </section>
      <section className="chapter-section chapter-dark creator-section">
        <p className="eyebrow">Influencers / People with a point of view</p>
        <h2>
          More than reach.
          <br />
          Real relevance.
        </h2>
        <p>
          Creator partnerships start with fit: the audience, the voice and the
          idea. From a focused collaboration to an ongoing ambassador program,
          we build around the connection.
        </p>
        <div className="creator-disciplines">
          <span>Culture & lifestyle</span>
          <span>Music & entertainment</span>
          <span>Community & experiences</span>
        </div>
        <button
          className="text-link"
          onClick={() => onSelect('Creator partnership')}
        >
          Talk creator partnerships <ArrowUpRight size={18} />
        </button>
      </section>
      <ChapterCTA
        title="Bring your point of view."
        label="Introduce yourself to DNA"
        onClick={() => onSelect('Staff or creator introduction')}
      />
    </>
  )
}
