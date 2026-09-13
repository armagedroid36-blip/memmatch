import { useCallback, useEffect, useState } from 'react'
import { fetchMatches } from '../lib/api'
import { t } from '../i18n/ru'
import type { Match } from '../types'

export default function MatchesScreen() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setMatches(await fetchMatches())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('matchesError'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <div className="screen"><div className="deck-placeholder">{t('matchesLoading')}</div></div>

  return (
    <div className="screen matches">
      <header className="topbar">
        <h2 className="section-title">{t('matchesTitle')}</h2>
        <button className="link small" onClick={() => void load()}>
          {t('matchesRefresh')}
        </button>
      </header>

      {error && <div className="error">{error}</div>}

      {matches.length === 0 ? (
        <div className="deck-placeholder">
          <p>{t('matchesEmpty')}</p>
          <p className="muted small">{t('matchesEmptyHint')}</p>
        </div>
      ) : (
        <ul className="match-list">
          {matches.map((m) => (
            <li key={m.user_id} className="card match-card">
              <div className="match-percent">{m.percent}%</div>
              <div className="match-info">
                <strong>{m.display_name}</strong>
                <span className="muted small">
                  {[m.age ? `${m.age}` : null, m.city].filter(Boolean).join(' · ') || '—'}
                </span>
                <span className="muted small">
                  {m.shared_memes_count} {t('matchesShared')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
