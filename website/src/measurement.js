// Local, PII-free integration point. No collector, cookies or network requests.
export function recordConversion(event, interest) {
  window.dispatchEvent(
    new CustomEvent('dna:conversion', {
      detail: { event, interest, path: window.location.pathname },
    }),
  )
}
