import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { fetchProfile } from './lib/api'
import { t } from './i18n/ru'
import type { AppUser, Tab } from './types'
import LandingScreen from './screens/LandingScreen'
import AuthScreen from './screens/AuthScreen'
import ProfileScreen from './screens/ProfileScreen'
import FeedScreen from './screens/FeedScreen'
import MatchesScreen from './screens/MatchesScreen'
import BottomNav from './components/BottomNav'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'signup' | 'signin' | null>(null)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [tab, setTab] = useState<Tab>('feed')

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (!next) setAuthMode(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    try {
      setProfile(await fetchProfile(userId))
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    const userId = session?.user?.id
    if (userId) void loadProfile(userId)
    else setProfile(null)
  }, [session?.user?.id, loadProfile])

  if (authLoading) return <div className="splash">Memder</div>

  // гость: сначала лендинг, дальше — регистрация/вход
  if (!session) {
    if (authMode) {
      return <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} />
    }
    return <LandingScreen onStart={(mode) => setAuthMode(mode)} />
  }

  if (profileLoading) return <div className="splash">{t('feedLoading')}</div>

  // вошёл, но профиля нет — сразу после регистрации
  if (!profile) {
    return <ProfileScreen userId={session.user.id} onDone={() => void loadProfile(session.user.id)} />
  }

  return (
    <div className="app-shell">
      {tab === 'feed' ? (
        <FeedScreen
          user={profile}
          onSignOut={() => {
            void supabase.auth.signOut()
          }}
        />
      ) : (
        <MatchesScreen />
      )}
      <BottomNav tab={tab} onChange={setTab} />
    </div>
  )
}
