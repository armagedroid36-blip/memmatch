import { useEffect, useState } from 'react'
import { fetchDeck } from '../lib/api'
import { t } from '../i18n/ru'
import type { Meme } from '../types'

interface Props {
  onStart: (mode: 'signup' | 'signin') => void
}

/** Лендинг для гостя: название, слоган, живой пример мема из ленты. */
export default function LandingScreen({ onStart }: Props) {
  const [sample, setSample] = useState<Meme | null>(null)

  useEffect(() => {
    void fetchDeck(undefined, 1)
      .then((deck) => setSample(deck[0] ?? null))
      .catch(() => setSample(null))
  }, [])

  return (
    <div className="screen landing">
      <header className="landing-head">
        <h1 className="brand">Memder</h1>
        <p className="tagline">{t('tagline')}</p>
      </header>

      <div className="landing-sample">
        <span className="sample-label">{t('landingSample')}</span>
        <div className="card-media">
          {sample ? (
            <img src={sample.image_url} alt="" width={600} height={800} />
          ) : (
            <div className="media-skeleton" />
          )}
        </div>
      </div>

      <p className="muted center pad">{t('landingLead')}</p>

      <div className="landing-actions">
        <button className="primary" onClick={() => onStart('signup')}>
          {t('landingCta')}
        </button>
        <button className="link" onClick={() => onStart('signin')}>
          {t('landingAlreadyHave')}
        </button>
      </div>
    </div>
  )
}
