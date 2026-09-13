import { useCallback, useEffect, useRef, useState } from 'react'
import { DECK_BATCH, PREFETCH_AT, fetchDeck, rateMeme } from '../lib/api'
import { t } from '../i18n/ru'
import type { AppUser, Meme, RatingValue } from '../types'

interface Props {
  user: AppUser
  onSignOut: () => void
}

const SWIPE_THRESHOLD = 80

export default function FeedScreen({ user, onSignOut }: Props) {
  const [deck, setDeck] = useState<Meme[]>([])
  const [index, setIndex] = useState(0)
  const [likes, setLikes] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  })
  const start = useRef<{ x: number; y: number } | null>(null)
  const loadingMore = useRef(false)

  /** Догрузка пачки: оценённые не приходят из get_deck, дубликаты отсекаем по id. */
  const loadBatch = useCallback(async () => {
    if (loadingMore.current) return
    loadingMore.current = true
    try {
      const batch = await fetchDeck(undefined, DECK_BATCH)
      setDeck((prev) => {
        const known = new Set(prev.map((m) => m.id))
        return [...prev, ...batch.filter((m) => !known.has(m.id))]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('feedErrorLoad'))
    } finally {
      loadingMore.current = false
    }
  }, [])

  // первая пачка
  useEffect(() => {
    void (async () => {
      setLoading(true)
      setDeck([])
      setIndex(0)
      await loadBatch()
      setLoading(false)
    })()
  }, [loadBatch])

  // prefetch за PREFETCH_AT карточек до конца пачки
  useEffect(() => {
    if (loading) return
    if (deck.length - index <= PREFETCH_AT && deck.length > 0) void loadBatch()
  }, [index, deck.length, loading, loadBatch])

  const current = deck[index]
  const next = deck[index + 1]

  const rate = useCallback(
    (value: RatingValue) => {
      if (!current) return
      // оптимистично: карточка сразу уходит, счётчик меняется
      setIndex((i) => i + 1)
      if (value === 'like') setLikes((l) => l + 1)
      void rateMeme(user.id, current.id, value).catch(() => {
        setError(t('feedErrorRating'))
        setIndex((i) => Math.max(0, i - 1)) // возвращаем карточку, если запись не прошла
      })
    },
    [current, user.id]
  )

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: 0, y: 0, active: true })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const x = e.clientX - start.current.x
    const y = e.clientY - start.current.y
    // не мешаем вертикальной прокрутке страницы: реагируем только на явный свайп
    if (Math.abs(x) > 10 || Math.abs(y) > 10) setDrag({ x, y, active: true })
  }
  const onPointerUp = () => {
    if (!start.current) return
    const { x, y } = drag
    start.current = null
    setDrag({ x: 0, y: 0, active: false })
    if (Math.abs(x) > SWIPE_THRESHOLD) {
      rate(x > 0 ? 'like' : 'dislike')
    } else if (y < -SWIPE_THRESHOLD) {
      rate('like') // свайп вверх = лайк
    }
  }

  const cardStyle = drag.active
    ? {
        transform: `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 30}deg)`,
        transition: 'none',
      }
    : { transform: 'none', transition: 'transform .25s ease' }

  return (
    <div className="screen feed">
      <header className="topbar">
        <div className="who">
          <strong>{user.display_name}</strong>
          <span className="muted small">
            {[user.age ? `${user.age}` : null, user.city].filter(Boolean).join(' · ') || '—'}
          </span>
        </div>
        <div className="topbar-right">
          <span className="pill">👍 {likes}</span>
          <button className="link small" onClick={onSignOut}>
            {t('signOut')}
          </button>
        </div>
      </header>

      {error && (
        <div className="error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="deck-placeholder">{t('feedLoading')}</div>
      ) : current ? (
        <div className="deck">
          <div
            className="deck-card"
            style={cardStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="card-media">
              <img src={current.image_url} alt="" loading="eager" decoding="async" />
            </div>
            {current.original_caption && <p className="caption">{current.original_caption}</p>}
          </div>
          {/* следующая карточка греется заранее — переключение без мигания */}
          {next && (
            <img className="preload" src={next.image_url} alt="" loading="lazy" decoding="async" />
          )}
          <div className="actions">
            <button className="btn-round skip" onClick={() => rate('dislike')} aria-label={t('feedSkip')}>
              ✖
            </button>
            <button className="btn-round like" onClick={() => rate('like')} aria-label={t('feedLike')}>
              👍
            </button>
          </div>
          <p className="muted small center hint">{t('feedHint')}</p>
        </div>
      ) : (
        <div className="deck-placeholder">
          <p>{t('feedEmpty')}</p>
          <p className="muted small">{t('feedEmptyHint')}</p>
          <button className="primary" onClick={() => void loadBatch()}>
            {t('feedRefresh')}
          </button>
        </div>
      )}
    </div>
  )
}
