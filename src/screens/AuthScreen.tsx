import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        if (!data.session) setInfo('Проверь почту и подтверди регистрацию.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось. Попробуй ещё раз.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen auth">
      <h1 className="brand">MemMatch</h1>
      <p className="muted">Свайпай мемы. Находи тех, у кого такой же юмор.</p>
      <form onSubmit={submit} className="card form">
        <input
          type="email"
          required
          placeholder="почта"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="пароль (от 6 символов)"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="error">{error}</div>}
        {info && <div className="info">{info}</div>}
        <button className="primary" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'signup' ? 'Создать аккаунт' : 'Войти'}
        </button>
      </form>
      <button className="link" onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
        {mode === 'signup' ? 'Уже есть аккаунт — войти' : 'Нет аккаунта — создать'}
      </button>
    </div>
  )
}
