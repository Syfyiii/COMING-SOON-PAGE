import { ArrowUpRight, Plus } from 'lucide-react'
import { catalogGroups } from '../data'

export function CatalogContent({ onSelect }) {
  return (
    <div className="catalog-groups">
      {catalogGroups.map((group, index) => (
        <details
          key={group.title}
          name="catalog"
          open={index === 0 ? true : undefined}
        >
          <summary>
            <h3>{group.title}</h3>
            <Plus size={20} className="details-plus" />
          </summary>
          <dl>
            {group.items.map(([name, price]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{price}</dd>
              </div>
            ))}
          </dl>
          {group.note && <p className="catalog-note">{group.note}</p>}
          <button className="text-link" onClick={() => onSelect(group.title)}>
            Talk about {group.title.toLowerCase()} <ArrowUpRight size={18} />
          </button>
        </details>
      ))}
    </div>
  )
}
