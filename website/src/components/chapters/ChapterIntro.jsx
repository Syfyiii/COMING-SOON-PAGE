export function ChapterIntro({ eyebrow, title, copy }) {
  return (
    <div className="chapter-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="chapter-title">{title}</h1>
      <p className="chapter-lead">{copy}</p>
    </div>
  )
}
