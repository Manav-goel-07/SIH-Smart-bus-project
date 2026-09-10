import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const hydrateProfile = useCallback(async (user) => {
    if (!user) { setProfile(null); return }
    const metadata = user.user_metadata || {}
    let profileData = null
    if (supabase) {
      const response = await supabase.from('profiles').select('role, full_name, bus_id').eq('id', user.id).maybeSingle()
      if (!response.error) profileData = response.data
    }
    setProfile({
      id: user.id,
      email: user.email,
      role: profileData?.role || user.app_metadata?.role || metadata.role || 'admin',
      full_name: profileData?.full_name || metadata.full_name || user.email?.split('@')[0] || 'Operator',
      bus_id: profileData?.bus_id || metadata.bus_id || ''
    })
  }, [])

  useEffect(() => {
    if (!supabaseConfigured || !supabase) { setLoading(false); return undefined }
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      await hydrateProfile(data.session?.user)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      await hydrateProfile(nextSession?.user)
      setLoading(false)
    })
    return () => { mounted = false; listener.subscription.unsubscribe() }
  }, [hydrateProfile])

  const signIn = async (email, password) => {
    if (!supabaseConfigured || !supabase) return { error: new Error('Supabase is not configured yet.') }
    setError('')
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) setError(result.error.message)
    return result
  }
  const signUp = async ({ email, password, fullName, role, busId }) => {
    if (!supabaseConfigured || !supabase) return { error: new Error('Supabase is not configured yet.') }
    setError('')
    const result = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role, bus_id: busId } } })
    if (result.error) setError(result.error.message)
    return result
  }
  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setSession(null); setProfile(null) }
  const value = useMemo(() => ({ session, user: session?.user || null, profile, loading, error, signIn, signUp, signOut, configured: supabaseConfigured }), [session, profile, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
