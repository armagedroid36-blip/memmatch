import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { fetchProfile } from './lib/api'
import type { AppUser } from './types'
import AuthScreen from './screens/AuthScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import FeedScreen from './screens/FeedScreen'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profile, setProfile] = useState<AppUser | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
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
    if (userId) {
      void loadProfile(userId)
    } else {
      setProfile(null)
    }
  }, [session?.user?.id, loadProfile])

  if (authLoading) return <div className="splash">MemMatch</div>
  if (!session) return <AuthScreen />
  if (profileLoading) return <div className="splash">Загружаем профиль…</div>
  if (!profile) {
    return <OnboardingScreen userId={session.user.id} onDone={() => void loadProfile(session.user.id)} />
  }

  return (
    <FeedScreen
      user={profile}
      onSignOut={() => {
        void supabase.auth.signOut()
      }}
    />
  )
}
