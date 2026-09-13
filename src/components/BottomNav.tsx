import { t } from '../i18n/ru'
import type { Tab } from '../types'

interface Props {
  tab: Tab
  onChange: (tab: Tab) => void
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'feed', label: t('navFeed'), icon: '▤' },
  { id: 'matches', label: t('navMatches'), icon: '♥' },
]

export default function BottomNav({ tab, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map((item) => (
        <button
          key={item.id}
          className={item.id === tab ? 'nav-item active' : 'nav-item'}
          onClick={() => onChange(item.id)}
          aria-current={item.id === tab}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
