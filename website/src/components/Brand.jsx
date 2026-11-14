export function Brand({ variant = 'white', mark = false, className = '' }) {
  return (
    <img
      className={className}
      src={`/brand/dna-${mark ? 'mark-' : ''}${variant}.svg`}
      alt=""
      aria-hidden="true"
      width={mark ? 646 : 917}
      height={390}
    />
  )
}
