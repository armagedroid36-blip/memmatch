import { useState } from 'react'
import { createProfile } from '../lib/api'
import { t } from '../i18n/ru'

interface Props {
  userId: string
  onDone: () => void
}

export default function ProfileScreen({ userId, onDone }: Props) {
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const ageNum = age.trim() ? Number(age) : null
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 14 || ageNum > 99)) {
      setError(t('profileAgeError'))
      return
    }
    setBusy(true)
    try {
      await createProfile({
        id: userId,
        display_name: displayName.trim(),
        age: ageNum,
        city: city.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen auth">
      <h1 className="brand">{t('profileTitle')}</h1>
      <p className="muted">{t('profileLead')}</p>
      <form onSubmit={submit} className="card form">
        <input
          required
          maxLength={40}
          placeholder={t('profileName')}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder={t('profileAge')}
          value={age}
          min={14}
          max={99}
          onChange={(e) => setAge(e.target.value)}
        />
        <input
          placeholder={t('profileCity')}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={busy || displayName.trim().length === 0}>
          {busy ? '…' : t('profileSubmit')}
        </button>
      </form>
    </div>
  )
}
