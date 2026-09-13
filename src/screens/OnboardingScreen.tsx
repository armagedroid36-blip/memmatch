import { useState } from 'react'
import { createProfile } from '../lib/api'

interface Props {
  userId: string
  onDone: () => void
}

export default function OnboardingScreen({ userId, onDone }: Props) {
  const [displayName, setDisplayName] = useState('')
  const [age, setAge] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const ageNum = age.trim() ? Number(age) : null
    if (ageNum !== null && (!Number.isInteger(ageNum) || ageNum < 14 || ageNum > 99)) {
      setError('Возраст — целое число от 14 до 99.')
      setBusy(false)
      return
    }
    try {
      await createProfile({
        id: userId,
        display_name: displayName.trim(),
        age: ageNum,
        city: city.trim() || null,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не сохранилось. Попробуй ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen auth">
      <h1 className="brand">Пара деталей</h1>
      <p className="muted">Никаких чатов и фото-верификаций на этом этапе — только имя.</p>
      <form onSubmit={submit} className="card form">
        <input
          required
          maxLength={40}
          placeholder="имя"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="возраст (необязательно)"
          value={age}
          min={14}
          max={99}
          onChange={(e) => setAge(e.target.value)}
        />
        <input
          placeholder="город (необязательно)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit" disabled={busy || displayName.trim().length === 0}>
          {busy ? '…' : 'Начать свайпать'}
        </button>
      </form>
    </div>
  )
}
