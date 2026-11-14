import { useId, useRef, useState } from 'react'

export function PanelTabs({
  label,
  items,
  initial = 0,
  selected: controlledSelected,
  onChange,
  children,
  vertical = false,
}) {
  const id = useId()
  const [localSelected, setLocalSelected] = useState(initial)
  const selected = controlledSelected ?? localSelected
  const buttons = useRef([])
  function select(index) {
    if (controlledSelected === undefined) setLocalSelected(index)
    onChange?.(index)
  }
  function navigate(event, index) {
    let next
    if (event.key === 'ArrowRight' || (vertical && event.key === 'ArrowDown'))
      next = (index + 1) % items.length
    if (event.key === 'ArrowLeft' || (vertical && event.key === 'ArrowUp'))
      next = (index - 1 + items.length) % items.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = items.length - 1
    if (next === undefined) return
    event.preventDefault()
    select(next)
    buttons.current[next].focus({ preventScroll: true })
  }
  return (
    <div className={`panel-tabs ${vertical ? 'panel-tabs-vertical' : ''}`}>
      <div
        className="panel-tablist"
        role="tablist"
        aria-label={label}
        aria-orientation={vertical ? 'vertical' : 'horizontal'}
      >
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            ref={(node) => {
              buttons.current[index] = node
            }}
            aria-controls={`${id}-content-${index}`}
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            onClick={() => select(index)}
            onKeyDown={(event) => navigate(event, index)}
          >
            {vertical && (
              <span className="tab-index" aria-hidden="true">
                0{index + 1}
              </span>
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div
          key={item.key}
          id={`${id}-content-${index}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${index}`}
          hidden={selected !== index}
          tabIndex={0}
        >
          {selected === index && children(item, index)}
        </div>
      ))}
    </div>
  )
}
