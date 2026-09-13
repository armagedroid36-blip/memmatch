import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCategories, fetchDeck, rateMeme } from '../lib/api'
import type { AppUser, Category, Meme, RatingValue } from '../types'

interface Props {
  user: AppUser
  onSignOut: () => void
}

export default function FeedScreen({ user, onSignOut }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined)
  const [deck, setDeck] = useState<Meme[]>([])
  const [index, setIndex] = useState(0)
  const [likes, setLikes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const touchX = useRef<number | null>(null)

  const load = useCallback(
    async (cat?: number) => {
      setLoading(true)
      setError(null)
      try {
        const next = await fetchDeck(user.id, cat)
        setDeck(next)
        setIndex(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не загрузилась лента.')
      } finally {
        setLoading(false)
      }
    },
    [user.id]
  )

  useEffect(() => {
    void fetchCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    void load(categoryId)
  }, [categoryId, load])

  const current = deck[index]
  const next = deck[index + 1]

  const handleRate = useCallback(
    (value: RatingValue) => {
      if (!current) return
      setIndex((i) => i + 1)
      if (value === 'like') setLikes((l) => l + 1)
      void rateMeme(user.id, current.id, value).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Оценка не сохранилась.')
      })
    },
    [current, user.id]
  )

  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    handleRate(dx > 0 ? 'like' : 'dislike')
  }

  return (
    <div className="screen feed">
      <header className="topbar">
        <div className="who">
          <strong>{user.display_name}</strong>
          <span className="muted small">
            {[user.age ? `${user.age}` : null, user.city].filter(Boolean).join(' · ') || 'без города'}
          </span>
        </div>
        <div className="topbar-right">
          <span className="pill">♥ {likes}</span>
          <button className="link small" onClick={onSignOut}>
            выйти
          </button>
        </div>
      </header>

      <div className="chips">
        <button
          className={categoryId === undefined ? 'chip active' : 'chip'}
          onClick={() => setCategoryId(undefined)}
        >
          все
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            className={categoryId === c.id ? 'chip active' : 'chip'}
            onClick={() => setCategoryId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="deck-placeholder">Грузим мемы…</div>
      ) : current ? (
        <div className="deck" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="meme-card">
            <img src={current.image_url} alt={current.original_caption ?? 'мем'} loading="eager" />
            {current.original_caption && <p className="caption">{current.original_caption}</p>}
            <span className="source">{current.source_name}</span>
          </div>
          <div className="actions">
            <button className="round skip" onClick={() => handleRate('dislike')} aria-label="скип">
              ✕
            </button>
            <button className="round like" onClick={() => handleRate('like')} aria-label="лайк">
              ♥
            </button>
          </div>
          <p className="muted small center">Свайп вправо — лайк, влево — скип</p>
          {next && <img className="preload" src={next.image_url} alt="" />}
        </div>
      ) : (
        <div className="deck-placeholder">
          <p>Колода закончилась.</p>
          <button className="primary" onClick={() => void load(categoryId)}>
            Обновить
          </button>
        </div>
      )}
    </div>
  )
}
