import { ArrowUpRight } from 'lucide-react'

export function ChapterCTA({ title, label, onClick }) {
  return (
    <div className="chapter-cta">
      <h2>{title}</h2>
      <button className="text-link" onClick={onClick}>
        {label}
        <ArrowUpRight size={20} />
      </button>
    </div>
  )
}
