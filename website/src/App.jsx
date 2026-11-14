import { useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { usePageMotion } from './usePageMotion'
import { ProjectDialog } from './components/ProjectDialog'
import { MediaDialog } from './components/MediaDialog'
import { Navigation } from './components/Navigation'
import { SitePanel } from './components/SitePanel'
import { ServiceBreakdown } from './components/ServiceBreakdown'
import { usePanelRoute } from './usePanelRoute'
import { stories } from './stories'
import { recordConversion } from './measurement'
import { HomeHero } from './components/HomeHero'
import { HomeWork } from './components/HomeWork'
import { HomeApproach } from './components/HomeApproach'
import { HomeFooter } from './components/HomeFooter'
import './dialogs.css'
import './App.css'
import './scroll-scenes.css'
import './components/Navigation.css'
import './site-panels.css'

function App({ initialRoute = null }) {
  const root = useRef(null)
  const project = useRef(null)
  const [projectInterest, setProjectInterest] = useState('Brand growth')
  const [activeStory, setActiveStory] = useState(null)
  usePageMotion(root)
  const { panel, openPanel, closePanel } = usePanelRoute(initialRoute)

  function startProject(interest = 'Brand growth') {
    recordConversion('inquiry_opened', interest)
    setProjectInterest(interest)
    project.current.showModal()
  }

  return (
    <div ref={root} className="site-shell" id="top">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navigation
        onStartProject={startProject}
        onOpenPanel={openPanel}
        activePanel={panel?.key}
      />

      <main id="main">
        <HomeHero primary={!panel} />

        <div className="intro-band">
          <span className="eyebrow">
            <span className="status-dot" /> Culture drives progress.
          </span>
          <p>Corporations. Culture. Connected.</p>
          <button className="text-link" onClick={() => openPanel('about')}>
            Meet DNA <ArrowUpRight size={16} />
          </button>
        </div>

        <HomeWork
          onStory={setActiveStory}
          onExplore={() => openPanel('work')}
        />

        <HomeApproach />

        <section
          className="capabilities-section section-pad"
          id="services"
          aria-labelledby="services-title"
          data-nav-tone="dark"
        >
          <div className="capabilities-intro">
            <p className="eyebrow">
              <span>/ 03</span> Our specialties
            </p>
            <h2 id="services-title" data-reveal>
              Three ways
              <br />
              to connect.
            </h2>
            <p>
              Experiential marketing brings people together. Digital marketing
              keeps the conversation moving. Influencer marketing connects your
              brand with voices people trust.
            </p>
            <button className="text-link" onClick={() => openPanel('services')}>
              All services & pricing <ArrowUpRight size={18} />
            </button>
          </div>
          <ServiceBreakdown onExplore={(tab) => openPanel('services', tab)} />
        </section>

        <section
          className="connection-panel"
          aria-labelledby="connection-title"
          data-nav-tone="light"
        >
          <div className="connection-image" data-mask>
            <img
              src="/media/street-connection.webp"
              alt="A conversation between guests at a neighborhood block party"
              width={1400}
              height={788}
              loading="lazy"
            />
          </div>
          <div className="connection-caption">
            <p className="eyebrow">At the heart of it all</p>
            <h2 id="connection-title">
              People move
              <br />
              everything.
            </h2>
            <button
              onClick={() => openPanel('services', 'plans')}
              className="text-link"
            >
              Build something that connects <ArrowUpRight size={20} />
            </button>
          </div>
        </section>
      </main>

      <HomeFooter startProject={startProject} openPanel={openPanel} />

      {panel && (
        <SitePanel
          route={panel}
          onClose={closePanel}
          onNavigate={openPanel}
          onSelect={startProject}
          stories={stories}
          onStory={setActiveStory}
        />
      )}
      <ProjectDialog dialogRef={project} interest={projectInterest} />
      {activeStory && (
        <MediaDialog story={activeStory} onClose={() => setActiveStory(null)} />
      )}
    </div>
  )
}

export default App
