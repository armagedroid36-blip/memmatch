import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { t } from '../i18n/ru'

interface Props {
  initialMode: 'signup' | 'signin'
  onBack: () => void
}

export default function AuthScreen({ initialMode, onBack }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) throw err
        if (!data.session) setInfo(t('authConfirmEmail'))
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) throw err
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen auth">
      <button className="link back" onClick={onBack}>
        ← {t('authBack')}
      </button>
      <h1 className="brand">{t('authTitle')}</h1>
      <form onSubmit={submit} className="card form">
        <input
          type="email"
          required
          placeholder={t('authEmail')}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder={t('authPassword')}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? t('authSignup') : t('authSignin')}
        </button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        {mode === 'signup' ? t('authSwitchToSignin') : t('authSwitchToSignup')}
      </button>
    </div>
  )
}
