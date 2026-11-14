// Runs inside Playwright's blank page: DOMParser keeps source markup inert.
export function parsePolicyHtml({ html, headings }) {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const container =
    document.querySelector('main.legal-document') ||
    document.querySelector('section .container')
  if (!container) throw new Error('Expected policy content was not found')
  const allowed = new Set([
    'h1', 'h2', 'h3', 'p', 'strong', 'em', 'a', 'br',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'ul', 'ol', 'li',
  ])
  const elements = []
  function childrenOf(node) {
    const children = []
    for (const child of node.childNodes) {
      const parsed = parse(child)
      if (
        parsed === '' ||
        (['table', 'thead', 'tbody', 'tr'].includes(node.localName) &&
          typeof parsed === 'string' && !parsed.trim())
      ) continue
      // Merge text split by discarded nodes so a second import is identical.
      if (typeof parsed === 'string' && typeof children.at(-1) === 'string')
        children[children.length - 1] += parsed
      else children.push(parsed)
    }
    return children
  }
  function parse(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (
      node.nodeType !== Node.ELEMENT_NODE ||
      !allowed.has(node.localName) ||
      node.classList.contains('policy-source')
    ) return ''
    const href = node.getAttribute('href')
    const parsed = {
      tag: node.localName,
      children: childrenOf(node),
      ...(node.localName === 'a' && href &&
        (/^(mailto:|tel:)/i.test(href) ||
          /^(privacy\.html|terms\.html|opt-in-evidence\.html)$/.test(href))
        ? { href }
        : {}),
    }
    elements.push(parsed)
    return parsed
  }
  const nodes = childrenOf(container)
  const text = (node) => typeof node === 'string' ? node : node.children.map(text).join('')
  const titles = elements.filter((node) => node.tag === 'h1')
  if (titles.length !== 1 || !headings.includes(text(titles[0]).replace(/\s+/g, ' ').trim()))
    throw new Error(`Expected policy heading: ${headings.join(' or ')}`)
  if (!elements.some((node) => ['p', 'li', 'td'].includes(node.tag) && text(node).trim()))
    throw new Error('Policy content is empty')
  return nodes
}
