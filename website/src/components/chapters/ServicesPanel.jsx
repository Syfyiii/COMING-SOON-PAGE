import { PanelTabs } from '../PanelTabs'
import { Packages } from '../Packages'
import { CatalogContent } from '../ServiceCatalog'
import { AIIntegrations } from '../ServiceBreakdown'
import { ChapterIntro } from './ChapterIntro'

const serviceTabs = [
  { key: 'projects', label: 'One-time services' },
  { key: 'ai', label: 'AI integrations' },
  { key: 'plans', label: 'Growth packages' },
]

export function ServicesPanel({ tab, onSelect, onNavigate }) {
  return (
    <>
      <ChapterIntro
        eyebrow="Services / Built around your business"
        title="The right next move."
        copy="Experiential, digital and influencer marketing connect your brand to culture. Explore the services, strategy and supporting tools that bring each campaign to life."
      />
      <noscript>
        <nav className="chapter-section" aria-label="Service pages">
          <a href="/services/">One-time services</a> /{' '}
          <a href="/services/ai-call-center/">AI integrations</a> /{' '}
          <a href="/services/growth-packages/">Growth packages</a>
        </nav>
      </noscript>
      <div className="chapter-section service-browser">
        <PanelTabs
          label="Service options"
          items={serviceTabs}
          selected={Math.max(
            0,
            serviceTabs.findIndex((item) => item.key === tab),
          )}
          onChange={(index) => onNavigate('services', serviceTabs[index].key)}
        >
          {(item) =>
            item.key === 'ai' ? (
              <AIIntegrations onSelect={onSelect} onPolicy={onNavigate} />
            ) : item.key === 'plans' ? (
              <Packages onSelect={onSelect} embedded />
            ) : (
              <>
                <div className="services-heading">
                  <h2>
                    A focused project.
                    <br />A meaningful step forward.
                  </h2>
                  <p>
                    Build the pieces your business needs now, with a clear scope
                    and room to grow.
                  </p>
                </div>
                <CatalogContent onSelect={onSelect} />
              </>
            )
          }
        </PanelTabs>
      </div>
    </>
  )
}
