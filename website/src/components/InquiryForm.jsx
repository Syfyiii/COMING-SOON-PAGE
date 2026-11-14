import { useRef, useState } from 'react'
import { ArrowUpRight, Download } from 'lucide-react'
import { contact } from '../contact'
import { inquiryEndpoint, inquiryPublicKey } from '../inquiry-config'
import { recordConversion } from '../measurement'

export function InquiryForm({ interest }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const [brief, setBrief] = useState('')
  const [receipt, setReceipt] = useState('')
  const attempt = useRef(null)
  const busy = status === 'sending'

  async function submit(event) {
    event.preventDefault()
    if (busy || status === 'submitted') return
    const fields =
      status === 'uncertain'
        ? attempt.current.payload
        : Object.fromEntries(new FormData(event.currentTarget))
    const payload = { ...fields, interest }
    const fingerprint = JSON.stringify(payload)
    if (attempt.current?.fingerprint !== fingerprint)
      attempt.current = { fingerprint, id: crypto.randomUUID(), payload }
    setBrief(
      `Name: ${fields.name}\nEmail: ${fields.email}\nBrand: ${fields.brand}\nInterest: ${interest}\nBudget: ${fields.budget}\n\n${fields.message}`,
    )
    setStatus('sending')
    setMessage('Submitting your inquiry…')
    try {
      const response = await fetch(inquiryEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${inquiryPublicKey}`,
          apikey: inquiryPublicKey,
        },
        body: JSON.stringify({ ...payload, requestId: attempt.current.id }),
        signal: AbortSignal.timeout(20000),
      })
      const result = await response.json()
      if (response.ok && result.status === 'submitted') {
        recordConversion('inquiry_accepted', interest)
        setStatus('submitted')
        setReceipt(result.requestId || attempt.current.id)
        setMessage('Your inquiry has been submitted. We’ll follow up by email.')
      } else if (
        ['pending', 'unknown'].includes(result.status) ||
        (status === 'uncertain' && result.status !== 'failed') ||
        !['failed', 'rejected', 'unavailable', 'rate_limited'].includes(
          result.status,
        )
      ) {
        setStatus('uncertain')
        setMessage(
          'We couldn’t confirm the email status. Please contact support with the reference below before sending again.',
        )
        setReceipt(attempt.current.id)
      } else {
        // A confirmed rejection sent nothing; only an explicit new click can retry.
        if (result.status === 'failed') attempt.current = null
        setStatus('error')
        setMessage(
          response.status === 400 && result.status === 'rejected'
            ? result.error || 'Check the fields and try again.'
            : response.status === 429
              ? 'Please wait before trying again, or email us directly.'
              : 'Your inquiry could not be submitted. Your details are still here—try again or email your brief.',
        )
      }
    } catch {
      // Reuse the same request ID when checking after a lost response; never send blindly twice.
      setStatus('uncertain')
      setReceipt(attempt.current.id)
      setMessage(
        'The connection was interrupted. Check the submission status or email us with this reference before sending again.',
      )
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([brief], { type: 'text/plain' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'DNA-project-brief.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <form onSubmit={submit}>
      <p className="interest-label">{interest}</p>
      <fieldset
        disabled={busy || status === 'submitted' || status === 'uncertain'}
        className="inquiry-fields"
      >
        <div className="form-row">
          <label>
            Your name
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
          <label>
            Work email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={160}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Brand / business
            <input
              name="brand"
              autoComplete="organization"
              required
              maxLength={150}
            />
          </label>
          <label>
            Budget
            <select name="budget" defaultValue="Let's discuss">
              <option>Let's discuss</option>
              <option>$500-$1,500</option>
              <option>$1,500-$3,500</option>
              <option>$3,500-$7,500</option>
              <option>$7,500-$15,000</option>
              <option>$15,000+</option>
            </select>
          </label>
        </div>
        <label>
          What do you want to move forward?
          <textarea name="message" rows={4} required maxLength={3000} />
        </label>
        <label className="form-trap" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </fieldset>
      <p className="form-privacy">
        Submitting sends your inquiry to {contact.email}. It does not enroll you
        in text messages.{' '}
        <a href="/privacy.html" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>{' '}
        /{' '}
        <a href="/terms.html" target="_blank" rel="noreferrer">
          Terms & Conditions
        </a>
      </p>
      {message && (
        <p
          className="inquiry-status"
          role={
            status === 'error' || status === 'uncertain' ? 'alert' : 'status'
          }
        >
          {message}
        </p>
      )}
      {receipt && <p className="inquiry-reference">Reference: {receipt}</p>}
      {status !== 'submitted' && (
        <button className="solid-button" type="submit" disabled={busy}>
          {busy
            ? 'Submitting…'
            : status === 'uncertain'
              ? 'Check submission status'
              : 'Send inquiry'}{' '}
          <ArrowUpRight size={18} />
        </button>
      )}
      {brief && (
        <div className="brief-ready">
          {status !== 'submitted' && (
            <a
              className="text-link"
              href={`mailto:${contact.email}?subject=${encodeURIComponent(`DNA project: ${interest}`)}&body=${encodeURIComponent(brief + (receipt ? '\n\nSubmission reference: ' + receipt : ''))}`}
            >
              Open email draft <ArrowUpRight size={18} />
            </a>
          )}
          <button type="button" className="text-link" onClick={download}>
            Download brief <Download size={17} />
          </button>
        </div>
      )}
    </form>
  )
}
