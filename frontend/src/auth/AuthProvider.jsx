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
      const response = await supabase.from('profiles').select('role, full_name, avatar_url, bus_id').eq('id', user.id).maybeSingle()
      if (!response.error) profileData = response.data
    }
    setProfile({
      id: user.id,
      email: user.email,
      role: profileData?.role || user.app_metadata?.role || metadata.role || 'admin',
      full_name: profileData?.full_name || metadata.full_name || user.email?.split('@')[0] || 'Operator',
      avatar_url: profileData?.avatar_url || metadata.avatar_url || '',
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
  const updateProfile = async ({ fullName, avatarFile }) => {
    if (!supabase || !session?.user) return { error: new Error('You must be signed in to update your profile.') }
    let avatarUrl = profile?.avatar_url || ''
    if (avatarFile) {
      const safeName = avatarFile.name.replace(/[^a-z0-9._-]/gi, '-')
      const path = `${session.user.id}/${Date.now()}-${safeName}`
      const upload = await supabase.storage.from('profile-avatars').upload(path, avatarFile, { upsert: false, contentType: avatarFile.type, cacheControl: '3600' })
      if (upload.error) return upload
      const signed = await supabase.storage.from('profile-avatars').createSignedUrl(path, 60 * 60 * 24 * 365)
      if (signed.error) return signed
      avatarUrl = signed.data.signedUrl
    }
    const result = await supabase.from('profiles').update({ full_name: fullName, avatar_url: avatarUrl }).eq('id', session.user.id)
    if (result.error) return result
    await supabase.auth.updateUser({ data: { full_name: fullName, avatar_url: avatarUrl } })
    setProfile((current) => ({ ...current, full_name: fullName, avatar_url: avatarUrl }))
    return { data: { fullName, avatarUrl }, error: null }
  }
  const value = useMemo(() => ({ session, user: session?.user || null, profile, loading, error, signIn, signUp, signOut, updateProfile, configured: supabaseConfigured }), [session, profile, loading, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }
