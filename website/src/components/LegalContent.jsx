import { createElement } from 'react'
import policies from '../policies.json'

const links = {
  'privacy.html': 'privacy',
  'terms.html': 'terms',
  'opt-in-evidence.html': 'sms',
}
const legalTitles = {
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  sms: 'SMS Consent Documentation',
}

function LegalNode({ node, onNavigate }) {
  if (typeof node === 'string') return node
  const props = {}
  if (node.href) {
    props.href = `/${node.href}`
    if (links[node.href])
      props.onClick = (event) => {
        if (
          event.button ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return
        event.preventDefault()
        onNavigate(links[node.href])
      }
    else props.href = node.href
  }
  if (node.tag === 'h1') props.id = 'chapter-title'
  return createElement(
    node.tag === 'h1' ? 'h2' : node.tag === 'h2' ? 'h3' : node.tag,
    props,
    node.tag === 'br'
      ? undefined
      : node.children.map((child, index) => (
          <LegalNode key={index} node={child} onNavigate={onNavigate} />
        )),
  )
}

export function LegalContent({ type, onNavigate }) {
  const policy = policies[type]
  return (
    <div className="legal-document">
      {policy.nodes.map((node, index) => (
        <LegalNode key={index} node={node} onNavigate={onNavigate} />
      ))}
      <p className="policy-source">
        Source:{' '}
        <a href={policy.source} target="_blank" rel="noreferrer">
          DNAgency LLC published {legalTitles[type].toLowerCase()}
        </a>
      </p>
      <nav className="legal-links" aria-label="Related policies">
        {Object.entries(legalTitles)
          .filter(([key]) => key !== type)
          .map(([key, title]) => (
            <button
              key={key}
              className="text-link"
              onClick={() => onNavigate(key)}
            >
              {title}
            </button>
          ))}
      </nav>
    </div>
  )
}
