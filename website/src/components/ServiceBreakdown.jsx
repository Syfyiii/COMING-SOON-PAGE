import { ArrowUpRight, PhoneCall } from 'lucide-react'
import { PanelTabs } from './PanelTabs'

const capabilities = [
  {
    key: 'culture',
    label: 'Experiential marketing',
    title: 'Give people a place in your brand.',
    copy: 'Bring your brand into the room, onto the street and into the community. We create live experiences that invite participation and build connections beyond the event.',
    services: 'Brand activations / Pop-ups / Live events / Event production',
  },
  {
    key: 'digital',
    label: 'Digital marketing',
    title: 'Turn attention into action.',
    copy: 'Meet people where they discover, share and decide. We connect content, paid media and digital experiences around your audience and your business goals.',
    services: 'Digital strategy / Social / Paid media / Websites / Email',
  },
  {
    key: 'content',
    label: 'Influencer marketing',
    title: 'Connect through voices people trust.',
    copy: 'Build partnerships with creators who share your audience, values and cultural context. From a single collaboration to an ambassador program, we put fit and credibility first.',
    services:
      'Creator partnerships / Influencer campaigns / UGC / Ambassador programs',
  },
]

export function ServiceBreakdown({ onExplore }) {
  return (
    <PanelTabs label="Service capabilities" items={capabilities} vertical>
      {(item) => (
        <div className="capability-detail">
          <h3>{item.title}</h3>
          <p>{item.copy}</p>
          <p className="capability-services">{item.services}</p>
          <button className="text-link" onClick={() => onExplore('projects')}>
            Explore services & pricing <ArrowUpRight size={18} />
          </button>
        </div>
      )}
    </PanelTabs>
  )
}

export function AIIntegrations({ onSelect, onPolicy }) {
  return (
    <div className="ai-integrations">
      <section className="ai-product">
        <p className="eyebrow">
          <PhoneCall size={18} aria-hidden="true" /> DNA AI Call Center
        </p>
        <h2>
          Make every inquiry
          <br />a better conversation.
        </h2>
        <p>
          AI-powered answering and appointment booking for local service
          businesses. Give callers a clear next step while your team stays
          focused on the work.
        </p>
        <div className="ai-features">
          <div>
            <span>01 / Answer</span>
            <h3>A helpful first response.</h3>
            <p>
              Handle routine questions using your approved business information,
              with an automated-assistant disclosure.
            </p>
          </div>
          <div>
            <span>02 / Book</span>
            <h3>Keep the next step simple.</h3>
            <p>
              Collect the details needed to schedule an appointment and connect
              the conversation to your booking workflow.
            </p>
          </div>
          <div>
            <span>03 / Follow through</span>
            <h3>Stay connected, with permission.</h3>
            <p>
              Appointment confirmations, reminders and rescheduling texts follow
              the caller's explicit verbal opt-in.
            </p>
          </div>
        </div>
        <div className="product-actions">
          <button
            className="solid-button"
            onClick={() => onSelect('DNA AI Call Center demo')}
          >
            Discuss the call center <ArrowUpRight size={18} />
          </button>
          <button className="text-link" onClick={() => onPolicy('sms')}>
            SMS consent & policies <ArrowUpRight size={18} />
          </button>
        </div>
        <p className="product-note">
          Implementation, integrations and usage are scoped to your business. AI
          can make mistakes; availability and outcomes are not guaranteed. Not
          for emergency services.
        </p>
      </section>
      <section className="automation-section">
        <p className="eyebrow">Beyond the phone</p>
        <h2>Connect the work behind the work.</h2>
        <div className="editorial-columns">
          <div>
            <h3>Lead & CRM workflows</h3>
            <p>
              Route inquiries, organize customer information and prompt the next
              follow-up.
            </p>
          </div>
          <div>
            <h3>AI customer support</h3>
            <p>
              Bring approved answers to your website, with clear escalation
              paths for your team.
            </p>
          </div>
          <div>
            <h3>Operations automation</h3>
            <p>
              Connect repetitive tasks across your existing tools, with human
              review where it matters.
            </p>
          </div>
        </div>
        <button
          className="text-link"
          onClick={() => onSelect('AI workflow integration')}
        >
          Scope an integration <ArrowUpRight size={18} />
        </button>
      </section>
    </div>
  )
}
