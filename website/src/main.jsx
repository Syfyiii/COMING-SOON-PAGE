import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const container = document.getElementById('root')
const app = (
  <StrictMode>
    <App initialRoute={JSON.parse(container.dataset.route || 'null')} />
  </StrictMode>
)
const options = {
  onUncaughtError() {
    const fallback = document.createElement('section')
    fallback.className = 'no-script-note'
    const heading = document.createElement('h1')
    heading.textContent = 'Let’s keep the conversation moving.'
    const link = document.createElement('a')
    link.href = 'mailto:support@digitalnativesagcy.com'
    link.textContent = 'Email support@digitalnativesagcy.com'
    fallback.append(heading, link)
    container.replaceChildren(fallback)
  },
}
if (container.hasChildNodes()) hydrateRoot(container, app, options)
else createRoot(container, options).render(app)
