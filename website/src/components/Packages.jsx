import { useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react'
import { plans } from '../data'

export function Packages({ onSelect, embedded = false }) {
  const [selected, setSelected] = useState(2)
  const tabs = useRef([])
  const plan = plans[selected]

  function navigate(event, index) {
    let next
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
      next = (index + 1) % plans.length
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
      next = (index - 1 + plans.length) % plans.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = plans.length - 1
    if (next === undefined) return
    event.preventDefault()
    setSelected(next)
    tabs.current[next].focus()
  }

  return (
    <section
      className={`packages-section section-pad${embedded ? ' packages-embedded' : ''}`}
      data-nav-tone="dark"
      id="packages"
      aria-labelledby="packages-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            {!embedded && <span>04</span>} A plan for your ambition
          </p>
          <h2 id="packages-title" data-reveal={embedded ? undefined : true}>
            Start here.
            <br />
            Go further.
          </h2>
        </div>
        <p className="section-aside">
          One launch or your next stage of growth.
          <br />
          Find the pace that fits your business.
        </p>
      </div>
      <div className="package-layout">
        <div
          className="plan-tabs"
          role="tablist"
          aria-label="Growth packages"
          aria-orientation="vertical"
        >
          {plans.map((item, index) => (
            <button
              key={item.name}
              ref={(node) => {
                tabs.current[index] = node
              }}
              id={`tab-${item.name}`}
              role="tab"
              aria-selected={index === selected}
              aria-controls="plan-detail"
              tabIndex={index === selected ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => navigate(event, index)}
            >
              <span className="plan-number">0{index + 1}</span>
              <span>{item.name}</span>
              <ArrowRight size={22} />
            </button>
          ))}
        </div>
        <div
          className="plan-detail"
          id="plan-detail"
          role="tabpanel"
          aria-labelledby={`tab-${plan.name}`}
          tabIndex={0}
        >
          <div key={plan.name} className="plan-detail-content">
            <div className="plan-intro">
              <p className="eyebrow">{plan.name}</p>
              <h3>{plan.outcome}</h3>
              <p>{plan.description}</p>
            </div>
            <div className="plan-price">
              <p>
                <strong>{plan.price}</strong>
                <span>/ month</span>
              </p>
              <span>{plan.setup} one-time setup</span>
            </div>
            <div className="plan-inclusions">
              <h4>Every month</h4>
              <ul>
                {plan.monthly.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <details className="plan-setup">
              <summary>
                Included in your setup{' '}
                <Plus size={18} className="details-plus" />
              </summary>
              <ul>
                {plan.setupItems.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
            <button
              className="solid-button"
              onClick={() => onSelect(`${plan.name} package`)}
            >
              Build with {plan.name} <ArrowUpRight size={19} />
            </button>
          </div>
        </div>
      </div>
      <p className="package-note">
        Managed ad spend limits are shown where applicable. Media and creator
        budgets are confirmed in your proposal.
      </p>
    </section>
  )
}
